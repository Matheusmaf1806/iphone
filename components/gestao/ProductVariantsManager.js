'use client';
import { useState, useEffect } from 'react';
import Loader from '../Loader';

export default function ProductVariantsManager({ productId, onClose }) {
  const [variants, setVariants] = useState([]);
  const [variantTypes, setVariantTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingVariant, setEditingVariant] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    attributes: {},
    price_adjustment: 0,
    price_adjustment_type: 'fixed',
    stock_quantity: 0,
    low_stock_threshold: 10,
    sku: '',
    image_url: '',
    weight: '',
    height: '',
    width: '',
    depth: '',
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar tipos de variantes
      const typesRes = await fetch('/api/product-variants?types=true');
      const typesData = await typesRes.json();
      if (typesData.success) {
        setVariantTypes(typesData.data);
      }

      // Carregar variantes do produto
      if (productId) {
        const variantsRes = await fetch(`/api/product-variants?productId=${productId}`);
        const variantsData = await variantsRes.json();
        if (variantsData.success) {
          setVariants(variantsData.data);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Erro ao carregar dados das variantes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar atributos
    if (Object.keys(formData.attributes).length === 0) {
      alert('Adicione pelo menos um atributo à variante');
      return;
    }

    try {
      const url = '/api/product-variants';
      const method = editingVariant ? 'PUT' : 'POST';
      const body = editingVariant
        ? { id: editingVariant.id, ...formData }
        : { product_id: productId, ...formData };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Variante ${editingVariant ? 'atualizada' : 'criada'} com sucesso!`);
        resetForm();
        loadData();
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Error saving variant:', error);
      alert('Erro ao salvar variante');
    }
  };

  const handleDelete = async (variantId) => {
    if (!confirm('Tem certeza que deseja excluir esta variante?')) return;

    try {
      const response = await fetch(`/api/product-variants?id=${variantId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('Variante excluída com sucesso!');
        loadData();
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting variant:', error);
      alert('Erro ao excluir variante');
    }
  };

  const handleEdit = (variant) => {
    setEditingVariant(variant);
    setFormData({
      attributes: variant.attributes || {},
      price_adjustment: variant.price_adjustment || 0,
      price_adjustment_type: variant.price_adjustment_type || 'fixed',
      stock_quantity: variant.stock_quantity || 0,
      low_stock_threshold: variant.low_stock_threshold || 10,
      sku: variant.sku || '',
      image_url: variant.image_url || '',
      weight: variant.weight || '',
      height: variant.height || '',
      width: variant.width || '',
      depth: variant.depth || '',
      is_active: variant.is_active !== false,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      attributes: {},
      price_adjustment: 0,
      price_adjustment_type: 'fixed',
      stock_quantity: 0,
      low_stock_threshold: 10,
      sku: '',
      image_url: '',
      weight: '',
      height: '',
      width: '',
      depth: '',
      is_active: true,
    });
    setEditingVariant(null);
    setShowForm(false);
  };

  const handleAttributeChange = (typeName, value) => {
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [typeName]: value,
      },
    }));
  };

  const removeAttribute = (typeName) => {
    const newAttributes = { ...formData.attributes };
    delete newAttributes[typeName];
    setFormData(prev => ({
      ...prev,
      attributes: newAttributes,
    }));
  };

  if (loading) {
    return <div className="p-4 flex items-center justify-center h-32"><div className="text-center"><Loader size="md" className="mx-auto mb-2" /><p className="text-gray-600 text-sm">Carregando variantes...</p></div></div>;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Gerenciar Variantes do Produto</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {!showForm ? (
            <>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Variantes Cadastradas ({variants.length})
                </h3>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  + Nova Variante
                </button>
              </div>

              {variants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhuma variante cadastrada.</p>
                  <p className="text-sm mt-2">Clique em "Nova Variante" para começar.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Atributos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Ajuste de Preço
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Estoque
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {variants.map((variant) => (
                        <tr key={variant.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(variant.attributes || {}).map(([key, value]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {variant.sku || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {variant.price_adjustment_type === 'percentage'
                              ? `${variant.price_adjustment}%`
                              : `R$ ${variant.price_adjustment.toFixed(2)}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {variant.stock_quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                variant.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {variant.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEdit(variant)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(variant.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {editingVariant ? 'Editar Variante' : 'Nova Variante'}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
              </div>

              {/* Atributos da Variante */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Atributos da Variante</h4>
                <div className="space-y-3">
                  {variantTypes.map((type) => (
                    <div key={type.id} className="flex items-center gap-2">
                      <label className="w-32 text-sm font-medium">{type.name}:</label>
                      <input
                        type="text"
                        value={formData.attributes[type.name] || ''}
                        onChange={(e) => handleAttributeChange(type.name, e.target.value)}
                        className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                        placeholder={`Ex: ${type.name === 'Tamanho' ? 'M, G, GG' : type.name === 'Cor' ? 'Azul, Vermelho' : 'Algodão, Poliéster'}`}
                      />
                      {formData.attributes[type.name] && (
                        <button
                          type="button"
                          onClick={() => removeAttribute(type.name)}
                          className="text-red-600 hover:text-red-800 px-2"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Informações de Preço */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ajuste de Preço</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_adjustment}
                    onChange={(e) =>
                      setFormData({ ...formData, price_adjustment: parseFloat(e.target.value) })
                    }
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Ajuste</label>
                  <select
                    value={formData.price_adjustment_type}
                    onChange={(e) =>
                      setFormData({ ...formData, price_adjustment_type: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fixed">Valor Fixo (R$)</option>
                    <option value="percentage">Percentual (%)</option>
                  </select>
                </div>
              </div>

              {/* Estoque */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantidade em Estoque</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Limite de Estoque Baixo</label>
                  <input
                    type="number"
                    value={formData.low_stock_threshold}
                    onChange={(e) =>
                      setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* SKU e Imagem */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">SKU (opcional)</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="Deixe em branco para gerar automaticamente"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">URL da Imagem (opcional)</label>
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Dimensões */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Peso (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Altura (cm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Largura (cm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Profundidade (cm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.depth}
                    onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Variante Ativa
                </label>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingVariant ? 'Atualizar' : 'Criar'} Variante
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
