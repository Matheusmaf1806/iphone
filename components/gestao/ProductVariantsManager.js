'use client';
import { useState, useEffect, useMemo } from 'react';
import Loader from '../Loader';
import { resolveCostPriceBRL } from '../../lib/pricing';

const MAX_VARIANT_IMAGES = 4;

// Gera um sufixo de SKU legível a partir dos valores do atributo, ex: {"Cor":"Titânio Azul","Armazenamento":"256GB"} -> "TITAZU-256GB"
function suggestSkuSuffix(attributes) {
  return Object.values(attributes)
    .map(v => String(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6))
    .join('-');
}

function attributesKey(attributes) {
  return Object.keys(attributes).sort().map(k => `${k}:${attributes[k]}`).join('|');
}

function cartesianProduct(axisValuePairs) {
  // axisValuePairs: [{ typeName, values: [string, ...] }, ...]
  return axisValuePairs.reduce((acc, axis) => {
    if (axis.values.length === 0) return acc;
    const next = [];
    for (const combo of acc) {
      for (const value of axis.values) {
        next.push({ ...combo, [axis.typeName]: value });
      }
    }
    return next;
  }, [{}]);
}

export default function ProductVariantsManager({ productId, productName, productSku, defaultMargin, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [axisTypes, setAxisTypes] = useState([]); // [{id, name, values: [{id, value, swatch_hex}]}]
  const [selectedTypeIds, setSelectedTypeIds] = useState(new Set());
  const [selectedValueIds, setSelectedValueIds] = useState({}); // { [typeId]: Set(valueId) }
  const [rows, setRows] = useState([]); // linhas da matriz (existentes + rascunho)
  const [newTypeName, setNewTypeName] = useState('');
  const [newValueDrafts, setNewValueDrafts] = useState({}); // { [typeId]: { value, swatch_hex } }
  const [bulkCost, setBulkCost] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const [platformConfig, setPlatformConfig] = useState({ usdBrlRate: 5.5, defaultImportTaxPercentage: 0 });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [typesRes, variantsRes, configRes] = await Promise.all([
        fetch('/api/product-variant-types?withValues=true'),
        fetch(`/api/product-variants?productId=${productId}`),
        fetch('/api/platform-config'),
      ]);
      const typesData = await typesRes.json();
      const variantsData = await variantsRes.json();
      const configData = await configRes.json();

      if (configData.success) {
        const byKey = Object.fromEntries(configData.data.map(c => [c.key, parseFloat(c.value)]));
        setPlatformConfig({
          usdBrlRate: byKey.usd_brl_rate || 5.5,
          defaultImportTaxPercentage: byKey.default_import_tax_percentage || 0,
        });
      }

      const types = typesData.success ? typesData.data : [];
      setAxisTypes(types);

      const existingVariants = variantsData.success ? variantsData.data : [];

      // Deduzir quais eixos/valores já estão em uso a partir das variantes existentes
      const usedTypeIds = new Set();
      const usedValueIds = {};
      existingVariants.forEach(v => {
        Object.keys(v.attributes || {}).forEach(typeName => {
          const type = types.find(t => t.name === typeName);
          if (!type) return;
          usedTypeIds.add(type.id);
          const value = v.attributes[typeName];
          const valueObj = (type.values || []).find(val => val.value === value);
          if (valueObj) {
            if (!usedValueIds[type.id]) usedValueIds[type.id] = new Set();
            usedValueIds[type.id].add(valueObj.id);
          }
        });
      });

      setSelectedTypeIds(usedTypeIds);
      setSelectedValueIds(usedValueIds);
      setRows(existingVariants.map(v => ({
        _key: v.id,
        id: v.id,
        attributes: v.attributes || {},
        cost_price: v.cost_price ?? '',
        cost_currency: v.cost_currency || 'BRL',
        import_tax_percentage: v.import_tax_percentage ?? '',
        supplier_margin_percentage: v.supplier_margin_percentage ?? '',
        stock_quantity: v.stock_quantity ?? 0,
        low_stock_threshold: v.low_stock_threshold ?? 10,
        sku: v.sku || '',
        image_urls: (v.image_urls && v.image_urls.length > 0) ? v.image_urls : (v.image_url ? [v.image_url] : []),
        is_default: v.is_default || false,
        is_active: v.is_active !== false,
      })));
    } catch (err) {
      console.error('Error loading variant data:', err);
      setError('Erro ao carregar dados de variantes');
    } finally {
      setLoading(false);
    }
  };

  const toggleType = (typeId) => {
    setSelectedTypeIds(prev => {
      const next = new Set(prev);
      if (next.has(typeId)) {
        next.delete(typeId);
      } else {
        next.add(typeId);
      }
      return next;
    });
  };

  const toggleValue = (typeId, valueId) => {
    setSelectedValueIds(prev => {
      const current = new Set(prev[typeId] || []);
      if (current.has(valueId)) {
        current.delete(valueId);
      } else {
        current.add(valueId);
      }
      return { ...prev, [typeId]: current };
    });
  };

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;
    try {
      const res = await fetch('/api/product-variant-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTypeName.trim(), display_order: axisTypes.length }),
      });
      const data = await res.json();
      if (data.success) {
        setAxisTypes(prev => [...prev, { ...data.data, values: [] }]);
        setSelectedTypeIds(prev => new Set(prev).add(data.data.id));
        setNewTypeName('');
      } else {
        alert(`Erro ao criar atributo: ${data.error}`);
      }
    } catch (err) {
      alert('Erro ao criar atributo');
    }
  };

  const handleCreateValue = async (typeId) => {
    const draft = newValueDrafts[typeId];
    if (!draft?.value?.trim()) return;
    try {
      const res = await fetch('/api/product-variant-types?resource=values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_type_id: typeId,
          value: draft.value.trim(),
          swatch_hex: draft.swatch_hex || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAxisTypes(prev => prev.map(t =>
          t.id === typeId ? { ...t, values: [...(t.values || []), data.data] } : t
        ));
        setSelectedValueIds(prev => ({
          ...prev,
          [typeId]: new Set(prev[typeId] || []).add(data.data.id),
        }));
        setNewValueDrafts(prev => ({ ...prev, [typeId]: { value: '', swatch_hex: '' } }));
      } else {
        alert(`Erro ao criar valor: ${data.error}`);
      }
    } catch (err) {
      alert('Erro ao criar valor');
    }
  };

  const handleGenerateMatrix = () => {
    const axisValuePairs = axisTypes
      .filter(t => selectedTypeIds.has(t.id))
      .map(t => ({
        typeName: t.name,
        values: (t.values || [])
          .filter(v => (selectedValueIds[t.id] || new Set()).has(v.id))
          .map(v => v.value),
      }))
      .filter(axis => axis.values.length > 0);

    if (axisValuePairs.length === 0) {
      alert('Selecione ao menos um atributo com pelo menos um valor');
      return;
    }

    const combos = cartesianProduct(axisValuePairs);

    // Produtos com muitos eixos (ex: Apple Watch = tamanho + material + conectividade
    // + pulseira + cor da pulseira...) podem gerar centenas de combinações de uma vez.
    // Avisa antes de despejar uma tabela gigante e impossível de revisar/preencher.
    if (combos.length > 100) {
      const proceed = confirm(
        `Essa seleção gera ${combos.length} combinações de uma vez — isso costuma ficar difícil de revisar.\n\n` +
        `Considere gerar por partes (ex: só um tamanho de caixa por vez) e repetir "Gerar combinações" depois.\n\n` +
        `Gerar os ${combos.length} SKUs mesmo assim?`
      );
      if (!proceed) return;
    }

    // Monta as linhas novas checando duplicidade sempre contra o estado mais atual
    // (função de atualização, não a variável "rows" do fechamento) — clicar duas
    // vezes seguidas em "Gerar combinações" não pode gerar SKUs repetidos.
    const buildRow = (combo) => ({
        _key: `draft-${attributesKey(combo)}-${Math.random().toString(36).slice(2, 8)}`,
        id: null,
        attributes: combo,
        cost_price: '',
        cost_currency: 'BRL',
        import_tax_percentage: '',
        supplier_margin_percentage: '',
        stock_quantity: 0,
        low_stock_threshold: 10,
        sku: `${(productSku || productName || 'SKU').toString().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}-${suggestSkuSuffix(combo)}`,
        image_urls: [],
        is_default: false,
        is_active: true,
    });

    let addedCount = 0;

    setRows(prev => {
      const existingKeys = new Set(prev.map(r => attributesKey(r.attributes)));
      const newRows = combos
        .filter(combo => !existingKeys.has(attributesKey(combo)))
        .map(buildRow);
      addedCount = newRows.length;

      if (newRows.length === 0) return prev;

      const merged = [...prev, ...newRows];
      if (!merged.some(r => r.is_default) && merged.length > 0) {
        merged[0] = { ...merged[0], is_default: true };
      }
      return merged;
    });

    if (addedCount === 0) {
      alert('Todas as combinações selecionadas já existem na tabela abaixo.');
    }
  };

  const updateRow = (key, field, value) => {
    setRows(prev => prev.map(r => (r._key === key ? { ...r, [field]: value } : r)));
  };

  const setRowAsDefault = (key) => {
    setRows(prev => prev.map(r => ({ ...r, is_default: r._key === key })));
  };

  const removeRow = async (row) => {
    if (row.id) {
      if (!confirm('Excluir este SKU definitivamente?')) return;
      try {
        const res = await fetch(`/api/product-variants?id=${row.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) {
          alert(`Erro ao excluir: ${data.error}`);
          return;
        }
      } catch (err) {
        alert('Erro ao excluir variante');
        return;
      }
    }
    setRows(prev => prev.filter(r => r._key !== row._key));
  };

  const applyBulkCost = () => {
    if (!bulkCost) return;
    setRows(prev => prev.map(r => ({ ...r, cost_price: bulkCost })));
  };

  const applyBulkCurrency = (currency) => {
    setRows(prev => prev.map(r => ({ ...r, cost_currency: currency })));
  };

  const applyBulkStock = () => {
    if (bulkStock === '') return;
    setRows(prev => prev.map(r => ({ ...r, stock_quantity: bulkStock })));
  };

  const handleImageUpload = async (key, file) => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'products');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setRows(prev => prev.map(r => (
          r._key === key ? { ...r, image_urls: [...(r.image_urls || []), data.url].slice(0, MAX_VARIANT_IMAGES) } : r
        )));
      } else {
        alert(data.error || 'Erro ao enviar imagem');
      }
    } catch (err) {
      alert('Erro ao enviar imagem');
    }
  };

  const removeVariantImage = (key, index) => {
    setRows(prev => prev.map(r => (
      r._key === key ? { ...r, image_urls: r.image_urls.filter((_, i) => i !== index) } : r
    )));
  };

  const handleSaveAll = async () => {
    if (rows.length === 0) {
      alert('Nenhum SKU para salvar. Gere combinações primeiro.');
      return;
    }
    const missingCost = rows.filter(r => r.is_active && (r.cost_price === '' || r.cost_price === null));
    if (missingCost.length > 0) {
      alert(`Preencha o custo de todos os SKUs ativos (${missingCost.length} faltando).`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        product_id: productId,
        variants: rows.map(r => ({
          id: r.id,
          sku: r.sku,
          attributes: r.attributes,
          cost_price: parseFloat(r.cost_price) || null,
          cost_currency: r.cost_currency || 'BRL',
          import_tax_percentage: r.import_tax_percentage !== '' && r.import_tax_percentage != null ? parseFloat(r.import_tax_percentage) : null,
          supplier_margin_percentage: r.supplier_margin_percentage ? parseFloat(r.supplier_margin_percentage) : null,
          stock_quantity: parseInt(r.stock_quantity) || 0,
          low_stock_threshold: parseInt(r.low_stock_threshold) || 10,
          image_urls: r.image_urls || [],
          is_default: r.is_default,
          is_active: r.is_active,
        })),
      };

      const res = await fetch('/api/product-variants/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        alert(`${data.data.length} SKU(s) salvo(s) com sucesso!`);
        loadData();
      } else {
        setError(data.error || 'Erro ao salvar variantes');
      }
    } catch (err) {
      console.error('Error saving variants:', err);
      setError('Erro ao salvar variantes');
    } finally {
      setSaving(false);
    }
  };

  const axisOrder = useMemo(() => {
    const set = new Set();
    rows.forEach(r => Object.keys(r.attributes).forEach(k => set.add(k)));
    return Array.from(set);
  }, [rows]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8"><Loader size="md" className="mx-auto mb-2" /><p className="text-gray-600 text-sm">Carregando variantes...</p></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold">Gerenciar Variantes (SKUs)</h2>
            <p className="text-sm text-gray-500 mt-0.5">{productName}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">{error}</div>
          )}

          {/* Passo 1: escolher eixos */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-1">1. Quais atributos esse produto varia?</h3>
            <p className="text-xs text-gray-500 mb-3">Ex: Versão, Cor, Armazenamento — cada um vira um seletor na página do produto.</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {axisTypes.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleType(type.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                    selectedTypeIds.has(type.id)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="+ Novo atributo (ex: Material)"
                className="flex-1 max-w-xs px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={handleCreateType} className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded hover:bg-gray-800">
                Adicionar
              </button>
            </div>
          </div>

          {/* Passo 2: escolher valores de cada eixo selecionado */}
          {axisTypes.filter(t => selectedTypeIds.has(t.id)).map(type => (
            <div key={type.id} className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Valores de "{type.name}"</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {(type.values || []).map(val => {
                  const checked = (selectedValueIds[type.id] || new Set()).has(val.id);
                  return (
                    <button
                      key={val.id}
                      type="button"
                      onClick={() => toggleValue(type.id, val.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                        checked ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {val.swatch_hex && (
                        <span className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: val.swatch_hex }} />
                      )}
                      {val.value}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="text"
                  value={newValueDrafts[type.id]?.value || ''}
                  onChange={(e) => setNewValueDrafts(prev => ({ ...prev, [type.id]: { ...prev[type.id], value: e.target.value } }))}
                  placeholder={type.name.toLowerCase().includes('cor') ? '+ Nova cor (ex: Titânio Verde)' : `+ Novo valor de ${type.name}`}
                  className="flex-1 max-w-xs px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                />
                {type.name.toLowerCase().includes('cor') && (
                  <input
                    type="color"
                    value={newValueDrafts[type.id]?.swatch_hex || '#888888'}
                    onChange={(e) => setNewValueDrafts(prev => ({ ...prev, [type.id]: { ...prev[type.id], swatch_hex: e.target.value } }))}
                    className="w-9 h-9 border rounded cursor-pointer"
                    title="Cor do swatch"
                  />
                )}
                <button type="button" onClick={() => handleCreateValue(type.id)} className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded hover:bg-gray-800">
                  Adicionar
                </button>
              </div>
            </div>
          ))}

          {/* Passo 3: gerar matriz */}
          {selectedTypeIds.size > 0 && (
            <button
              type="button"
              onClick={handleGenerateMatrix}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              ⚙️ Gerar combinações (SKUs)
            </button>
          )}

          {/* Passo 4: tabela de SKUs */}
          {rows.length > 0 && (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
                <h3 className="font-semibold">SKUs ({rows.length})</h3>
                <div className="flex gap-2 items-end flex-wrap">
                  <div>
                    <label className="block text-xs text-gray-500">Moeda de todos</label>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => applyBulkCurrency('BRL')} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">R$</button>
                      <button type="button" onClick={() => applyBulkCurrency('USD')} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">US$</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Aplicar custo a todos</label>
                    <div className="flex gap-1">
                      <input type="number" step="0.01" value={bulkCost} onChange={(e) => setBulkCost(e.target.value)} className="w-24 px-2 py-1 text-sm border rounded" placeholder="R$" />
                      <button type="button" onClick={applyBulkCost} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">Aplicar</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Aplicar estoque a todos</label>
                    <div className="flex gap-1">
                      <input type="number" value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} className="w-20 px-2 py-1 text-sm border rounded" placeholder="Qtd" />
                      <button type="button" onClick={applyBulkStock} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">Aplicar</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {axisOrder.map(name => (
                        <th key={name} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{name}</th>
                      ))}
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Custo</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Imposto (%)</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Margem (%)</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estoque</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fotos (até {MAX_VARIANT_IMAGES})</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Padrão</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Ativo</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map(row => (
                      <tr key={row._key} className={!row.is_active ? 'opacity-50' : ''}>
                        {axisOrder.map(name => (
                          <td key={name} className="px-3 py-2 whitespace-nowrap font-medium text-gray-700">{row.attributes[name] || '-'}</td>
                        ))}
                        <td className="px-3 py-2">
                          <input type="text" value={row.sku} onChange={(e) => updateRow(row._key, 'sku', e.target.value)} className="w-32 px-2 py-1 border rounded text-xs font-mono" />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 items-start">
                            <select value={row.cost_currency} onChange={(e) => updateRow(row._key, 'cost_currency', e.target.value)} className="px-1 py-1 border rounded text-xs">
                              <option value="BRL">R$</option>
                              <option value="USD">US$</option>
                            </select>
                            <div>
                              <input type="number" step="0.01" min="0" value={row.cost_price} onChange={(e) => updateRow(row._key, 'cost_price', e.target.value)} className="w-20 px-2 py-1 border rounded" placeholder="obrigatório" />
                              {row.cost_currency === 'USD' && row.cost_price && (
                                <p className="text-[10px] text-gray-500 mt-0.5">≈ R$ {(parseFloat(row.cost_price) * platformConfig.usdBrlRate).toFixed(2)}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" step="0.01" min="0" value={row.import_tax_percentage} onChange={(e) => updateRow(row._key, 'import_tax_percentage', e.target.value)} className="w-16 px-2 py-1 border rounded" placeholder={`${platformConfig.defaultImportTaxPercentage} (padrão)`} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" step="0.01" min="0" max="100" value={row.supplier_margin_percentage} onChange={(e) => updateRow(row._key, 'supplier_margin_percentage', e.target.value)} className="w-20 px-2 py-1 border rounded" placeholder={defaultMargin ? `${defaultMargin} (padrão)` : 'padrão'} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" value={row.stock_quantity} onChange={(e) => updateRow(row._key, 'stock_quantity', e.target.value)} className="w-20 px-2 py-1 border rounded" />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1 flex-wrap w-32">
                            {(row.image_urls || []).map((url, idx) => (
                              <div key={idx} className="relative group">
                                <img src={url} alt="" className="w-8 h-8 rounded object-cover border" />
                                <button
                                  type="button"
                                  onClick={() => removeVariantImage(row._key, idx)}
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] leading-4 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remover foto"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            {(row.image_urls || []).length < MAX_VARIANT_IMAGES && (
                              <label className="w-8 h-8 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 cursor-pointer text-lg leading-none">
                                +
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(row._key, e.target.files[0])} />
                              </label>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input type="radio" name="default_variant" checked={row.is_default} onChange={() => setRowAsDefault(row._key)} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={row.is_active} onChange={(e) => updateRow(row._key, 'is_active', e.target.checked)} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => removeRow(row)} className="text-red-600 hover:text-red-800 text-xs font-medium">Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
              Fechar
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || rows.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {saving ? 'Salvando...' : `💾 Salvar ${rows.length} SKU(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
