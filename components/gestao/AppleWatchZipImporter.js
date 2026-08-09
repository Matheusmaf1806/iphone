'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { PRODUCT_LINES, buildSku, buildAttributes } from '../../lib/appleWatch2025Catalog.mjs';

// Importador específico pra estes 3 zips de Apple Watch (SE 3 / Series 11 / Ultra 3) —
// não é um "importar qualquer zip" genérico. A tabela pasta->atributos em
// lib/appleWatch2025Catalog.mjs foi conferida manualmente contra as 38 pastas reais.
//
// Roda inteiramente no navegador (JSZip lê o zip localmente) e sobe cada foto pelo
// mesmo /api/upload que o resto do admin já usa — por isso não precisa de nenhuma
// chave de Supabase no seu computador, só estar logado no admin.

function contentTypeFor(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

// Pega os arquivos de imagem de uma pasta dentro do zip, ignora lixo do macOS e
// coloca a foto "de frente" primeiro (vira a capa do SKU). Até 4 fotos por SKU.
function listImageEntries(zip, folderPrefix) {
  const entries = Object.keys(zip.files)
    .filter(name => name.startsWith(folderPrefix) && !zip.files[name].dir)
    .filter(name => {
      const base = name.slice(folderPrefix.length);
      if (base.includes('/')) return false; // ignora subpastas eventuais
      if (base.startsWith('.') || base.startsWith('_')) return false;
      return /\.(jpe?g|png|webp)$/i.test(base);
    });
  entries.sort((a, b) => a.localeCompare(b));
  const frenteIdx = entries.findIndex(name => name.toLowerCase().includes('frente'));
  if (frenteIdx > 0) {
    const [frente] = entries.splice(frenteIdx, 1);
    entries.unshift(frente);
  }
  return entries.slice(0, 4);
}

export default function AppleWatchZipImporter() {
  const [files, setFiles] = useState({}); // { 'SE 3': File, 'Series 11': File, 'Ultra 3': File }
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);

  const appendLog = (msg) => setLog(prev => [...prev, msg]);

  const handleFileChange = (lineFolder, file) => {
    setFiles(prev => ({ ...prev, [lineFolder]: file || undefined }));
  };

  async function uploadImage(blob, filename, folderPath) {
    const formData = new FormData();
    formData.append('file', new File([blob], filename, { type: contentTypeFor(filename) }));
    formData.append('folder', folderPath);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Falha no upload');
    return data.url;
  }

  async function findOrCreateProduct(line) {
    const searchRes = await fetch(`/api/products/search?q=${encodeURIComponent(line.productName)}`, {
      credentials: 'include',
    });
    const searchData = await searchRes.json();
    const existing = (searchData.data || []).find(p => p.slug === line.slug);
    if (existing) {
      appendLog(`  Produto "${line.productName}" já existe — reaproveitando.`);
      return { id: existing.id, hasCoverImage: !!existing.image_url };
    }

    const createRes = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        product: {
          slug: line.slug,
          name: line.productName,
          category: 'apple-watch',
          has_variants: true,
          stock_type: 'limited',
          is_active: true,
          supplier_margin_percentage: 10,
        },
      }),
    });
    const createData = await createRes.json();
    if (!createData.success) throw new Error(createData.error || `Falha ao criar produto ${line.productName}`);
    appendLog(`  Produto "${line.productName}" criado.`);
    return { id: createData.product.id, hasCoverImage: false };
  }

  async function getExistingSkus(productId) {
    const res = await fetch(`/api/product-variants?productId=${productId}`, { credentials: 'include' });
    const data = await res.json();
    return new Set((data.data || []).map(v => v.sku));
  }

  async function importLine(line, file) {
    appendLog(`\n=== ${line.productName} ===`);
    appendLog('  Lendo zip...');
    const zip = await JSZip.loadAsync(file);

    const { id: productId, hasCoverImage } = await findOrCreateProduct(line);
    const existingSkus = await getExistingSkus(productId);

    const rows = [];
    let firstImageUrl = null;

    for (const entry of line.entries) {
      const sku = buildSku(line.slug, entry);
      if (existingSkus.has(sku)) {
        appendLog(`  SKU ${sku} já existe — pulando.`);
        continue;
      }

      const folderPrefix = `${line.lineFolder}/${entry.folder}/`;
      const imageEntries = listImageEntries(zip, folderPrefix);
      if (imageEntries.length === 0) {
        appendLog(`  [aviso] pasta não encontrada no zip: ${entry.folder}`);
        continue;
      }

      appendLog(`  Subindo fotos: ${entry.folder} (${imageEntries.length})...`);
      const imageUrls = [];
      for (const entryName of imageEntries) {
        const filename = entryName.slice(folderPrefix.length);
        const blob = await zip.files[entryName].async('blob');
        const url = await uploadImage(blob, filename, `products/${line.slug}/${sku}`);
        imageUrls.push(url);
      }

      if (!firstImageUrl) firstImageUrl = imageUrls[0];

      rows.push({
        sku,
        attributes: buildAttributes(entry),
        image_url: imageUrls[0],
        image_urls: imageUrls,
        cost_price: null,
        stock_quantity: 0,
        is_active: true,
      });
    }

    if (rows.length > 0) {
      const bulkRes = await fetch('/api/product-variants/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ product_id: productId, variants: rows }),
      });
      const bulkData = await bulkRes.json();
      if (!bulkData.success) throw new Error(bulkData.error || `Falha ao salvar SKUs de ${line.productName}`);
      appendLog(`  ${rows.length} SKU(s) criado(s).`);
    } else {
      appendLog('  Nenhum SKU novo pra criar.');
    }

    if (firstImageUrl && !hasCoverImage) {
      // Só define a foto de capa do produto se ele ainda não tiver uma.
      await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ product: { id: productId, _partialUpdate: true, image_url: firstImageUrl } }),
      }).catch(() => {});
    }
  }

  const runImport = async () => {
    const selected = PRODUCT_LINES.filter(line => files[line.lineFolder]);
    if (selected.length === 0) {
      alert('Selecione pelo menos um dos 3 arquivos .zip.');
      return;
    }

    setRunning(true);
    setLog([]);
    try {
      for (const line of selected) {
        await importLine(line, files[line.lineFolder]);
      }
      appendLog('\nPronto! Agora preenche custo/margem/estoque em "Gerenciar Variantes" de cada produto.');
    } catch (err) {
      console.error(err);
      appendLog(`\n❌ Erro: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Importar Apple Watch (SE 3 / Series 11 / Ultra 3)</h2>
      <p className="text-sm text-gray-500 mb-6">
        Sobe os 3 zips de fotos organizadas por variante e cria os SKUs automaticamente
        (fotos + atributos). Preço fica em branco de propósito — preencha depois em
        &quot;Gerenciar Variantes&quot; de cada produto.
      </p>

      <div className="space-y-4 mb-6">
        {PRODUCT_LINES.map(line => (
          <div key={line.lineFolder}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {line.productName} <span className="text-gray-400">({line.entries.length} SKUs)</span>
            </label>
            <input
              type="file"
              accept=".zip"
              disabled={running}
              onChange={(e) => handleFileChange(line.lineFolder, e.target.files?.[0])}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={runImport}
        disabled={running}
        className="px-6 py-3 rounded-xl font-bold text-white bg-black disabled:opacity-50 transition-all hover:shadow-lg"
      >
        {running ? 'Importando...' : 'Importar'}
      </button>

      {log.length > 0 && (
        <pre className="mt-6 bg-gray-900 text-gray-100 text-xs rounded-xl p-4 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
          {log.join('\n')}
        </pre>
      )}
    </div>
  );
}
