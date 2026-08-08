'use client';

import { useState, Fragment } from 'react';

export default function StockManager({ products: initialProducts }) {
  const [products, setProducts] = useState(initialProducts || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, low, out
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [editingVariantId, setEditingVariantId] = useState(null);
  const [editingVariantValue, setEditingVariantValue] = useState('');
  const [savingVariant, setSavingVariant] = useState(false);

  // Classify stock status
  const getStatusFor = (quantity, threshold) => {
    if (quantity <= 0) return 'out';
    if (quantity <= (threshold || 10)) return 'low';
    return 'normal';
  };
  const getStatus = (product) => getStatusFor(product.stock_quantity, product.low_stock_threshold);

  const toggleExpanded = (productId) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const startEditVariant = (variant) => {
    setEditingVariantId(variant.id);
    setEditingVariantValue(String(variant.stockQuantity ?? 0));
  };

  const cancelEditVariant = () => {
    setEditingVariantId(null);
    setEditingVariantValue('');
  };

  const saveEditVariant = async (variant, productId) => {
    const newQty = parseInt(editingVariantValue);
    if (isNaN(newQty) || newQty < 0) return;

    setSavingVariant(true);
    try {
      const res = await fetch('/api/product-variants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: variant.id, stock_quantity: newQty }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts(prev => prev.map(p => {
          if (p.id !== productId) return p;
          const updatedVariants = (p.variants || []).map(v => (v.id === variant.id ? { ...v, stockQuantity: newQty } : v));
          const total = updatedVariants.reduce((sum, v) => sum + Math.max(0, v.stockQuantity || 0), 0);
          return { ...p, variants: updatedVariants, stock_quantity: total };
        }));
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (err) {
      console.error('Error updating variant stock:', err);
      alert('Erro ao atualizar estoque da variante');
    }
    setSavingVariant(false);
    setEditingVariantId(null);
    setEditingVariantValue('');
  };

  // Summary stats
  const totalProducts = products.length;
  const lowStock = products.filter(p => getStatus(p) === 'low').length;
  const outOfStock = products.filter(p => getStatus(p) === 'out').length;
  const totalUnits = products.reduce((sum, p) => sum + Math.max(0, p.stock_quantity || 0), 0);

  // Filter and search
  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filter === 'low') return matchesSearch && getStatus(p) === 'low';
    if (filter === 'out') return matchesSearch && getStatus(p) === 'out';
    return matchesSearch;
  });

  // Handle inline edit
  const startEdit = (product) => {
    setEditingId(product.id);
    setEditValue(String(product.stock_quantity));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (product) => {
    const newQty = parseInt(editValue);
    if (isNaN(newQty) || newQty < 0) return;

    setSaving(true);
    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          product: {
            ...product,
            stock_quantity: newQty,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setProducts(products.map(p =>
          p.id === product.id ? { ...p, stock_quantity: newQty } : p
        ));
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (err) {
      console.error('Error updating stock:', err);
      alert('Erro ao atualizar estoque');
    }
    setSaving(false);
    setEditingId(null);
    setEditValue('');
  };

  const statusBadge = (product) => {
    const status = getStatus(product);
    if (status === 'out') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Esgotado
        </span>
      );
    }
    if (status === 'low') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
          Estoque Baixo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Normal
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Gestão de Estoque</h1>
        <p className="text-gray-600">Controle o estoque dos produtos com quantidade limitada</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Produtos Rastreados</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalProducts}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Unidades em Estoque</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalUnits}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Estoque Baixo</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{lowStock}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Esgotados</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{outOfStock}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar por nome ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'low', label: 'Estoque Baixo' },
              { key: 'out', label: 'Esgotados' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === opt.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhum produto encontrado</h3>
          <p className="text-gray-500 text-sm">
            {searchTerm || filter !== 'all'
              ? 'Ajuste seus filtros de busca'
              : 'Nenhum produto com estoque limitado cadastrado'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Quantidade
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Limite
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((product) => {
                  const hasVariants = product.variants && product.variants.length > 0;
                  const isExpanded = expandedIds.has(product.id);

                  return (
                  <Fragment key={product.id}>
                  <tr className={`hover:bg-gray-50 transition-colors ${
                    getStatus(product) === 'out' ? 'bg-red-50/50' :
                    getStatus(product) === 'low' ? 'bg-yellow-50/30' : ''
                  }`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {hasVariants && (
                          <button
                            onClick={() => toggleExpanded(product.id)}
                            className="text-gray-400 hover:text-gray-700 flex-shrink-0"
                            title={isExpanded ? 'Recolher SKUs' : `Ver ${product.variants.length} SKUs`}
                          >
                            <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                          <p className="text-xs text-gray-500">
                            {product.category || 'Sem categoria'}
                            {hasVariants && ` · ${product.variants.length} SKU(s)`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 font-mono">{product.sku || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {hasVariants ? (
                        <span className="text-sm font-bold text-gray-900" title="Soma de todos os SKUs ativos">
                          {product.stock_quantity}
                        </span>
                      ) : editingId === product.id ? (
                        <input
                          type="number"
                          min="0"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(product);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="w-20 text-center border border-blue-400 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <span className={`text-sm font-bold ${
                          product.stock_quantity <= 0 ? 'text-red-600' :
                          product.stock_quantity <= (product.low_stock_threshold || 10) ? 'text-yellow-600' :
                          'text-gray-900'
                        }`}>
                          {product.stock_quantity}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-500">{product.low_stock_threshold || 10}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {statusBadge(product)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {hasVariants ? (
                        <button
                          onClick={() => toggleExpanded(product.id)}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          {isExpanded ? 'Recolher' : 'Ver SKUs'}
                        </button>
                      ) : editingId === product.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => saveEdit(product)}
                            disabled={saving}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Salvar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Cancelar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(product)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar quantidade"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>

                  {hasVariants && isExpanded && product.variants.map((variant) => {
                    const status = getStatusFor(variant.stockQuantity, variant.lowStockThreshold);
                    const attrsLabel = Object.entries(variant.attributes || {}).map(([k, v]) => `${k}: ${v}`).join(' · ');
                    return (
                      <tr key={variant.id} className={`text-sm ${
                        status === 'out' ? 'bg-red-50/40' : status === 'low' ? 'bg-yellow-50/20' : 'bg-gray-50/60'
                      }`}>
                        <td className="px-6 py-2.5 pl-16">
                          <p className="text-gray-700">{attrsLabel || '—'}</p>
                        </td>
                        <td className="px-6 py-2.5">
                          <span className="text-xs text-gray-500 font-mono">{variant.sku || '-'}</span>
                        </td>
                        <td className="px-6 py-2.5 text-center">
                          {editingVariantId === variant.id ? (
                            <input
                              type="number"
                              min="0"
                              value={editingVariantValue}
                              onChange={(e) => setEditingVariantValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditVariant(variant, product.id);
                                if (e.key === 'Escape') cancelEditVariant();
                              }}
                              className="w-20 text-center border border-blue-400 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          ) : (
                            <span className={`text-xs font-bold ${
                              status === 'out' ? 'text-red-600' : status === 'low' ? 'text-yellow-600' : 'text-gray-700'
                            }`}>
                              {variant.stockQuantity}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-2.5 text-center">
                          <span className="text-xs text-gray-500">{variant.lowStockThreshold || 10}</span>
                        </td>
                        <td className="px-6 py-2.5 text-center">
                          {status === 'out' ? (
                            <span className="text-[11px] font-semibold text-red-600">Esgotado</span>
                          ) : status === 'low' ? (
                            <span className="text-[11px] font-semibold text-yellow-600">Estoque Baixo</span>
                          ) : (
                            <span className="text-[11px] font-semibold text-green-600">Normal</span>
                          )}
                        </td>
                        <td className="px-6 py-2.5 text-center">
                          {editingVariantId === variant.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => saveEditVariant(variant, product.id)}
                                disabled={savingVariant}
                                className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                title="Salvar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={cancelEditVariant}
                                className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                                title="Cancelar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditVariant(variant)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Editar estoque do SKU"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
