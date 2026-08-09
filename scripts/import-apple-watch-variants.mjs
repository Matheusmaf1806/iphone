#!/usr/bin/env node
/**
 * Importa os SKUs de Apple Watch SE 3 / Series 11 / Ultra 3 a partir das pastas de
 * fotos extraídas dos zips que o Matheus mandou (cada zip = 1 produto, cada subpasta
 * dentro dele = 1 combinação de cor/tamanho/pulseira, com até 3 fotos).
 *
 * NÃO precisa mexer no código do site nem reiniciar nada — o script fala direto com o
 * Supabase (mesmas credenciais do .env.local do projeto) e sobe as fotos + cria os SKUs
 * já com atributos certos. Depois é só abrir "Gerenciar Variantes" no admin de cada
 * produto e preencher custo/margem/estoque por linha (o script não inventa preço).
 *
 * Como usar:
 *   1) Rode a migration supabase/migrations/add_watch_2025_lineup_catalog.sql no SQL
 *      Editor do Supabase (opcional, mas sem isso as cores não ganham "swatch" colorido).
 *   2) Extraia os 3 zips numa mesma pasta, ex:
 *        mkdir -p ~/watch-import
 *        unzip -o "SE_3.zip"      -d ~/watch-import
 *        unzip -o "Series_11.zip" -d ~/watch-import
 *        unzip -o "Ultra_3.zip"   -d ~/watch-import
 *      (fica ~/watch-import/SE 3, ~/watch-import/Series 11, ~/watch-import/Ultra 3)
 *   3) Rode, na raiz do projeto (onde já existe o .env.local com as chaves do Supabase):
 *        node scripts/import-apple-watch-variants.mjs ~/watch-import
 *
 * O script testa permissão de upload/escrita ANTES de mexer em qualquer produto. Se
 * der erro logo no início dizendo que falta a service_role key, pega ela em Supabase
 * Dashboard > Project Settings > API > "service_role" (secreta, não é a "anon public"),
 * adiciona no .env.local como SUPABASE_SERVICE_ROLE_KEY=... e roda de novo.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { PRODUCT_LINES, buildSku, buildAttributes } from '../lib/appleWatch2025Catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// Carrega .env.local manualmente (sem depender do pacote dotenv) — só preenche
// variáveis que ainda não estão setadas no ambiente.
function loadEnvLocal() {
  const envPath = path.join(repoRoot, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltam as variáveis NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  console.error('Rode este script na raiz do projeto (onde tem o .env.local) ou exporte as variáveis antes.');
  process.exit(1);
}

const baseDir = process.argv[2];
if (!baseDir) {
  console.error('Uso: node scripts/import-apple-watch-variants.mjs <pasta-com-as-3-pastas-extraidas>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

// Testa upload + escrita na tabela ANTES de criar qualquer produto — se a chave usada
// não tiver permissão (bucket de storage costuma exigir a service role, não a anon key),
// é melhor descobrir isso em 1 segundo do que no meio da importação dos 38 SKUs.
async function preflightCheck() {
  console.log(`Testando permissões (usando ${usingServiceRole ? 'SUPABASE_SERVICE_ROLE_KEY' : 'NEXT_PUBLIC_SUPABASE_ANON_KEY'})...`);

  const testPath = `products/_import-preflight-check-${Date.now()}.txt`;
  const { error: uploadErr } = await supabase.storage
    .from('images')
    .upload(testPath, Buffer.from('preflight check'), { contentType: 'text/plain' });

  if (uploadErr) {
    console.error('\n❌ Falha ao testar upload no bucket "images":', uploadErr.message);
    if (!usingServiceRole) {
      console.error('   Você está usando a chave pública (NEXT_PUBLIC_SUPABASE_ANON_KEY).');
      console.error('   Pega a "service_role key" em Supabase > Project Settings > API,');
      console.error('   adiciona SUPABASE_SERVICE_ROLE_KEY=... no .env.local e roda de novo.');
    }
    process.exit(1);
  }
  await supabase.storage.from('images').remove([testPath]);

  const { error: tableErr } = await supabase.from('products').select('id').limit(1);
  if (tableErr) {
    console.error('\n❌ Falha ao ler a tabela "products":', tableErr.message);
    process.exit(1);
  }

  console.log('✅ Permissões OK — pode confiar no restante do import.\n');
}

// Lista os arquivos de imagem de uma pasta, ignorando lixo do macOS (__MACOSX, ._*),
// e coloca a foto "de frente" primeiro (fica a capa do SKU).
function listImageFiles(dirPath) {
  const files = fs.readdirSync(dirPath).filter(f => {
    if (f.startsWith('.') || f.startsWith('__MACOSX')) return false;
    return /\.(jpe?g|png|webp)$/i.test(f);
  });
  files.sort((a, b) => a.localeCompare(b));
  const frenteIdx = files.findIndex(f => f.toLowerCase().includes('frente'));
  if (frenteIdx > 0) {
    const [frente] = files.splice(frenteIdx, 1);
    files.unshift(frente);
  }
  return files.slice(0, 4); // o sistema aceita até 4 fotos por SKU
}

async function uploadImage(localPath, storagePath) {
  const buffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  const { error } = await supabase.storage.from('images').upload(storagePath, buffer, {
    contentType,
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw new Error(`Upload falhou (${storagePath}): ${error.message}`);

  const { data } = supabase.storage.from('images').getPublicUrl(storagePath);
  return data.publicUrl;
}

async function ensureProduct(line) {
  const { data: existing, error: selectErr } = await supabase
    .from('products')
    .select('id')
    .eq('slug', line.slug)
    .maybeSingle();
  if (selectErr) throw new Error(`Erro buscando produto ${line.slug}: ${selectErr.message}`);

  if (existing) {
    console.log(`  Produto "${line.productName}" já existe (id ${existing.id}) — reaproveitando.`);
    return existing.id;
  }

  const { data: created, error: insertErr } = await supabase
    .from('products')
    .insert({
      slug: line.slug,
      name: line.productName,
      category: 'apple-watch',
      category_slug: 'apple-watch',
      has_variants: true,
      stock_type: 'limited',
      is_active: true,
      supplier_margin_percentage: 10,
    })
    .select('id')
    .single();
  if (insertErr) throw new Error(`Erro criando produto ${line.slug}: ${insertErr.message}`);

  console.log(`  Produto "${line.productName}" criado (id ${created.id}).`);
  return created.id;
}

async function importLine(line) {
  console.log(`\n=== ${line.productName} ===`);
  const lineDir = path.join(baseDir, line.lineFolder);
  if (!fs.existsSync(lineDir)) {
    console.error(`  Pasta não encontrada: ${lineDir} — pulando este produto.`);
    return;
  }

  const productId = await ensureProduct(line);

  const { data: existingVariants, error: existingErr } = await supabase
    .from('product_variants')
    .select('sku')
    .eq('product_id', productId);
  if (existingErr) throw new Error(existingErr.message);
  const existingSkus = new Set((existingVariants || []).map(v => v.sku));

  let firstImageUrl = null;
  const rows = [];

  for (const entry of line.entries) {
    const folderPath = path.join(lineDir, entry.folder);
    if (!fs.existsSync(folderPath)) {
      console.warn(`  [aviso] pasta de fotos não encontrada, pulando: ${entry.folder}`);
      continue;
    }

    const sku = buildSku(line.slug, entry);
    if (existingSkus.has(sku)) {
      console.log(`  SKU ${sku} já existe — pulando (apague a variante no admin se quiser reimportar).`);
      continue;
    }

    const files = listImageFiles(folderPath);
    if (files.length === 0) {
      console.warn(`  [aviso] nenhuma foto válida em ${entry.folder}, pulando.`);
      continue;
    }

    process.stdout.write(`  Subindo fotos: ${entry.folder} (${files.length}) ... `);
    const imageUrls = [];
    for (const file of files) {
      const storagePath = `products/${line.slug}/${sku}/${file}`;
      const url = await uploadImage(path.join(folderPath, file), storagePath);
      imageUrls.push(url);
    }
    console.log('ok');

    if (!firstImageUrl) firstImageUrl = imageUrls[0];

    rows.push({
      product_id: productId,
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
    const { error: insertErr } = await supabase.from('product_variants').insert(rows);
    if (insertErr) throw new Error(`Erro inserindo variantes de ${line.productName}: ${insertErr.message}`);
    console.log(`  ${rows.length} SKU(s) criado(s).`);
  } else {
    console.log('  Nenhum SKU novo pra criar.');
  }

  // Atualiza a foto de capa do produto (mostrada nas listagens) se ainda não tiver uma.
  if (firstImageUrl) {
    const { data: current } = await supabase.from('products').select('image_url').eq('id', productId).single();
    if (!current?.image_url) {
      await supabase.from('products').update({ image_url: firstImageUrl }).eq('id', productId);
    }
  }

  // has_variants + stock_type já são setados na criação do produto, mas garante de
  // novo aqui caso o produto já existisse antes com esses campos diferentes.
  await supabase.from('products').update({ has_variants: true, stock_type: 'limited' }).eq('id', productId);
}

async function main() {
  await preflightCheck();
  console.log(`Lendo pastas em: ${baseDir}`);
  for (const line of PRODUCT_LINES) {
    await importLine(line);
  }
  console.log('\nPronto! Agora abre o admin -> Produtos -> cada Apple Watch -> "Gerenciar Variantes"');
  console.log('e preenche custo/margem/estoque de cada SKU (o script não define preço).');
}

main().catch(err => {
  console.error('\nErro no import:', err.message);
  process.exit(1);
});
