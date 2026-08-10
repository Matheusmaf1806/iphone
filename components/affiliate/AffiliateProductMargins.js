'use client';

import { useState, useEffect } from 'react';
import AffiliateLayout from './AffiliateLayout';
import Loader from '../Loader';

export default function AffiliateProductMargins({ session }) {
  const [products, setProducts] = useState([]);
  const [customMargins, setCustomMargins] = useState([]);
  const [defaultMargin, setDefaultMargin] = useState(10.0);
  const [pendingDefaultMargin, setPendingDefaultMargin] = useState(10.0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [customRate, setCustomRate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar produtos
      const productsRes = await fetch('/api/affiliate/products', {
        credentials: 'include',
      });
      const productsData = await productsRes.json();

      // Carregar margens customizadas
      const marginsRes = await fetch('/api/affiliate/product-commissions', {
        credentials: 'include',
      });
      const marginsData = await marginsRes.json();

      if (productsData.success) {
        setProducts(productsData.data || []);
      }

      if (marginsData.success) {
        setCustomMargins(marginsData.data.customCommissions || []);
        const rate = marginsData.data.defaultCommissionRate || 10.0;
        setDefaultMargin(rate);
        setPendingDefaultMargin(rate);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar dados' });
    } finally {
      setLoading(false);
    }
  };

  const getProductMargin = (productId) => {
    const custom = customMargins.find(m => m.product_id === productId);
    return custom ? custom.custom_commission_rate : null;
  };

  const getEffectiveMargin = (productId) => {
    const custom = getProductMargin(productId);
    return custom !== null ? custom : defaultMargin;
  };

  const calculatePrices = (product, margin) => {
    const costPrice = parseFloat(product.cost_price || 0);
    const supplierMargin = parseFloat(product.supplier_margin_percentage || 10);
    const affiliateMargin = parseFloat(margin);

    // Preço net (após margem do fornecedor)
    const netPrice = costPrice / (1 - supplierMargin / 100);

    // Preço PIX (após margem do afiliado)
    const pixPrice = netPrice / (1 - affiliateMargin / 100);

    // Lucro do afiliado
    const affiliateProfit = pixPrice - netPrice;

    return {
      netPrice: netPrice.toFixed(2),
      pixPrice: pixPrice.toFixed(2),
      affiliateProfit: affiliateProfit.toFixed(2),
    };
  };

  const handleEditMargin = (product) => {
    const currentMargin = getProductMargin(product.id);
    setEditingProduct(product);
    setCustomRate(currentMargin !== null ? currentMargin.toString() : '');
  };

  const handleSaveMargin = async () => {
    if (!editingProduct) return;

    const rate = parseFloat(customRate);

    if (isNaN(rate) || rate < 0 || rate > 100) {
      setMessage({ type: 'error', text: 'Margem deve estar entre 0 e 100%' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/affiliate/product-commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          product_id: editingProduct.id,
          custom_commission_rate: rate,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao salvar margem');
      }

      setMessage({ type: 'success', text: 'Margem customizada salva com sucesso!' });
      setEditingProduct(null);
      setCustomRate('');
      await loadData();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCustomMargin = async (productId) => {
    if (!confirm('Deseja remover a margem customizada? O produto voltará a usar a margem padrão.')) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/affiliate/product-commissions?product_id=${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao remover margem');
      }

      setMessage({ type: 'success', text: 'Margem customizada removida!' });
      await loadData();
    } catch (error) {
      console.error('Erro ao remover:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDefaultMargin = async () => {
    const margin = parseFloat(pendingDefaultMargin);
    if (isNaN(margin) || margin < 5 || margin > 20) {
      setMessage({ type: 'error', text: 'Margem padrão deve estar entre 5% e 20%' });
      return;
    }

    setSavingDefault(true);
    setMessage(null);

    try {
      const response = await fetch('/api/affiliate/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ commission_percentage: margin }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao salvar margem padrão');
      }

      setDefaultMargin(margin);
      setMessage({ type: 'success', text: 'Margem padrão atualizada com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar margem padrão:', error);
      setMessage({ type: 'error', text: error.message });
      setPendingDefaultMargin(defaultMargin);
    } finally {
      setSavingDefault(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AffiliateLayout session={session}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Carregando produtos...</p>
          </div>
        </div>
      </AffiliateLayout>
    );
  }

  return (
    <AffiliateLayout session={session}>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Margens por Produto
          </h1>
          <p className="text-gray-600">
            Configure margens customizadas para produtos específicos
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' :
            message.type === 'error' ? 'bg-red-50 text-red-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            <i className={`fas ${
              message.type === 'success' ? 'fa-check-circle' :
              message.type === 'error' ? 'fa-exclamation-circle' :
              'fa-info-circle'
            }`}></i>
            <span className="font-medium">{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <i className="fas fa-info-circle text-blue-600 text-xl mt-1"></i>
            <div>
              <h3 className="font-bold text-blue-900 mb-2">
                Como funcionam as margens?
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Margem Padrão:</strong> {defaultMargin}% - aplicada a todos os produtos sem configuração customizada</li>
                <li>• <strong>Margem Customizada:</strong> Você pode definir uma margem diferente para produtos específicos</li>
                <li>• <strong>Seu Lucro:</strong> É calculado sobre o preço que você paga ao fornecedor (já com margem dele)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Margem Padrão (Global) */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fas fa-sliders-h text-brand-yellow"></i>
            Margem Padrão
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Essa margem é aplicada a todos os produtos que não possuem margem customizada.
            Você pode configurar entre <strong>5% e 20%</strong>.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Margem Atual: <span className="text-brand-yellow font-bold text-xl">{pendingDefaultMargin}%</span>
            </label>
            <input
              type="range"
              min="5"
              max="20"
              step="0.5"
              value={pendingDefaultMargin}
              onChange={(e) => setPendingDefaultMargin(parseFloat(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-yellow"
            />
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>5%</span>
              <span>20%</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Exemplo de cálculo:</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Preço NET:</span>
                <span className="font-semibold">R$ 38,89</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sua margem ({pendingDefaultMargin}%):</span>
                <span className="font-semibold text-brand-yellow">
                  R$ {(38.89 * pendingDefaultMargin / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-600">Preço PIX:</span>
                <span className="font-bold text-gray-900">
                  R$ {(38.89 / (1 - pendingDefaultMargin / 100)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {pendingDefaultMargin !== defaultMargin && (
            <button
              onClick={handleSaveDefaultMargin}
              disabled={savingDefault}
              className="w-full bg-gradient-to-r from-brand-yellow to-yellow-400 text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              {savingDefault ? (
                <>
                  <Loader size="xs" className="mr-2 inline-block" />
                  Salvando...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Salvar Margem Padrão
                </>
              )}
            </button>
          )}
        </div>

        {/* Margens por Produto */}
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <i className="fas fa-list text-brand-yellow"></i>
          Margens por Produto
        </h2>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20 transition-all"
            />
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Custo Base
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Margem Atual
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Seu Preço
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Seu Lucro
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const currentMargin = getEffectiveMargin(product.id);
                  const isCustom = getProductMargin(product.id) !== null;
                  const prices = calculatePrices(product, currentMargin);

                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-600">
                          R$ {parseFloat(product.cost_price || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`font-bold ${isCustom ? 'text-brand-yellow' : 'text-gray-700'}`}>
                            {currentMargin.toFixed(2)}%
                          </span>
                          {isCustom ? (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                              Customizada
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">Padrão</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-green-600">
                          R$ {prices.pixPrice}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-blue-600">
                          R$ {prices.affiliateProfit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditMargin(product)}
                            className="px-3 py-1.5 bg-brand-yellow text-white rounded-lg text-sm font-medium hover:bg-yellow-400 transition-all"
                            title="Editar margem"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          {isCustom && (
                            <button
                              onClick={() => handleRemoveCustomMargin(product.id)}
                              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-all"
                              title="Remover customização"
                            >
                              <i className="fas fa-undo"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <i className="fas fa-search text-gray-400 text-4xl mb-3"></i>
              <p className="text-gray-600 font-medium">Nenhum produto encontrado</p>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Editar Margem
                </h2>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Produto:</p>
                <p className="font-medium text-gray-900">{editingProduct.name}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Margem Customizada (%)
                </label>
                <input
                  type="number"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder={`Padrão: ${defaultMargin}%`}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Deixe em branco para usar a margem padrão ({defaultMargin}%)
                </p>
              </div>

              {customRate && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">Simulação:</p>
                  {(() => {
                    const rate = parseFloat(customRate) || defaultMargin;
                    const sim = calculatePrices(editingProduct, rate);
                    return (
                      <div className="text-sm text-blue-800 space-y-1">
                        <div className="flex justify-between">
                          <span>Seu preço de venda:</span>
                          <span className="font-bold">R$ {sim.pixPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Seu lucro por unidade:</span>
                          <span className="font-bold">R$ {sim.affiliateProfit}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveMargin}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-brand-yellow text-white rounded-lg font-bold hover:bg-yellow-400 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader size="xs" className="mr-2 inline-block" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AffiliateLayout>
  );
}
