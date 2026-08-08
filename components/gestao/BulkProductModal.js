'use client';

import { useState } from 'react';
import ImageUpload from '../shared/ImageUpload';

export default function BulkProductModal({ onClose, onSave }) {
  const [products, setProducts] = useState([
    {
      name: '',
      slug: '',
      category: '',
      cost_price: '',
      supplier_margin_percentage: 10,
      stock_quantity: 0,
      image_url: '',
      sku: ''
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Gerar slug automaticamente do nome
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleProductChange = (index, field, value) => {
    const newProducts = [...products];
    newProducts[index][field] = value;

    // Auto-gerar slug ao digitar nome
    if (field === 'name' && value) {
      newProducts[index].slug = generateSlug(value);
    }

    setProducts(newProducts);
  };

  const addProduct = () => {
    setProducts([
      ...products,
      {
        name: '',
        slug: '',
        category: '',
        cost_price: '',
        supplier_margin_percentage: 10,
        stock_quantity: 0,
        image_url: '',
        sku: ''
      }
    ]);
  };

  const removeProduct = (index) => {
    if (products.length === 1) {
      alert('Você precisa ter pelo menos um produto');
      return;
    }
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
  };

  const duplicateProduct = (index) => {
    const productToDuplicate = { ...products[index] };
    productToDuplicate.name = productToDuplicate.name + ' (cópia)';
    productToDuplicate.slug = generateSlug(productToDuplicate.name);
    productToDuplicate.sku = '';
    const newProducts = [...products];
    newProducts.splice(index + 1, 0, productToDuplicate);
    setProducts(newProducts);
  };

  const addMultipleProducts = (count) => {
    const newProducts = Array.from({ length: count }, () => ({
      name: '',
      slug: '',
      category: '',
      cost_price: '',
      supplier_margin_percentage: 10,
      stock_quantity: 0,
      image_url: '',
      sku: ''
    }));
    setProducts([...products, ...newProducts]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validar produtos
    const validProducts = products.filter(p => p.name && p.cost_price);

    if (validProducts.length === 0) {
      setError('Adicione pelo menos um produto válido (com nome e preço de custo)');
      setLoading(false);
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let i = 0; i < validProducts.length; i++) {
        const product = validProducts[i];

        // Calcular preço de venda
        const costPrice = parseFloat(product.cost_price);
        const margin = parseFloat(product.supplier_margin_percentage);
        const salePrice = costPrice / (1 - margin / 100);

        const productData = {
          name: product.name,
          slug: product.slug || generateSlug(product.name),
          category: product.category || null,
          image_url: product.image_url || null,
          price: salePrice,
          cost_price: costPrice,
          supplier_margin_percentage: margin,
          sku: product.sku || null,
          stock_quantity: parseInt(product.stock_quantity) || 0,
          low_stock_threshold: 10,
          is_active: true,
          is_featured: false,
        };

        try {
          const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product: productData }),
          });

          const data = await response.json();

          if (data.success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`${product.name}: ${data.error || 'Erro desconhecido'}`);
          }
        } catch (err) {
          errorCount++;
          errors.push(`${product.name}: Erro de rede`);
        }
      }

      if (successCount > 0) {
        setSuccess(`${successCount} produto(s) cadastrado(s) com sucesso!`);

        if (errorCount === 0) {
          setTimeout(() => {
            onSave();
            onClose();
          }, 1500);
        }
      }

      if (errorCount > 0) {
        setError(`${errorCount} erro(s): ${errors.join(', ')}`);
      }

    } catch (error) {
      console.error('Erro ao salvar produtos:', error);
      setError('Erro ao processar produtos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Cadastro em Massa de Produtos
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="fas fa-times text-2xl"></i>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={addProduct}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              + 1 produto
            </button>
            <button
              type="button"
              onClick={() => addMultipleProducts(10)}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              + 10 produtos
            </button>
            <button
              type="button"
              onClick={() => addMultipleProducts(50)}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              + 50 produtos
            </button>
            <div className="ml-auto text-sm text-gray-600">
              Total: {products.length} produto(s)
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {products.map((product, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">
                      Produto #{index + 1}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => duplicateProduct(index)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                        title="Duplicar"
                      >
                        <i className="fas fa-copy"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProduct(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                        title="Remover"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nome *
                      </label>
                      <input
                        type="text"
                        value={product.name}
                        onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Nome do produto"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Categoria
                      </label>
                      <input
                        type="text"
                        value={product.category}
                        onChange={(e) => handleProductChange(index, 'category', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Ex: Eletrônicos"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        SKU
                      </label>
                      <input
                        type="text"
                        value={product.sku}
                        onChange={(e) => handleProductChange(index, 'sku', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Código SKU"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Preço de Custo (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={product.cost_price}
                        onChange={(e) => handleProductChange(index, 'cost_price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Margem Supplier (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={product.supplier_margin_percentage}
                        onChange={(e) => handleProductChange(index, 'supplier_margin_percentage', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="10"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Estoque
                      </label>
                      <input
                        type="number"
                        value={product.stock_quantity}
                        onChange={(e) => handleProductChange(index, 'stock_quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="0"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <ImageUpload
                        value={product.image_url}
                        onChange={(url) => handleProductChange(index, 'image_url', url)}
                        label="Imagem"
                        compact={true}
                      />
                    </div>
                  </div>

                  {product.cost_price && (
                    <div className="mt-2 text-xs text-gray-600">
                      Preço de Venda: R$ {(parseFloat(product.cost_price) / (1 - parseFloat(product.supplier_margin_percentage) / 100)).toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : `Cadastrar ${products.filter(p => p.name && p.cost_price).length} Produto(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
