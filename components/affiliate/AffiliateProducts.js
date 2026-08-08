'use client';

import { useState, useEffect } from 'react';
import AffiliateLayout from './AffiliateLayout';
import Loader from '../Loader';

export default function AffiliateProducts({ session }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/affiliate/products');
      const data = await response.json();

      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (link, productId) => {
    navigator.clipboard.writeText(link);
    setCopiedId(productId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(products.map(p => p.category))];

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
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <i className="fas fa-box text-brand-yellow"></i>
            Produtos Disponíveis
          </h1>
          <p className="text-gray-600">
            Confira os produtos disponíveis para venda e copie seus links de afiliado
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Produto
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="fas fa-search text-gray-400"></i>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite o nome do produto..."
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-yellow transition-colors"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-yellow transition-colors"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Mostrando <span className="font-semibold text-gray-900">{filteredProducts.length}</span> de{' '}
            <span className="font-semibold text-gray-900">{products.length}</span> produtos
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all">
              {/* Product Image */}
              <div className="relative h-48 bg-gray-100">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <i className="fas fa-image text-4xl text-gray-300"></i>
                  </div>
                )}
                {product.stock_quantity <= 10 && (
                  <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Estoque Baixo
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-6">
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>
                )}

                {/* Prices */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Preço PIX:</span>
                    <span className="font-bold text-green-600">
                      R$ {product.prices.pix.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Preço Cartão:</span>
                    <span className="font-bold text-gray-900">
                      R$ {product.prices.card.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t-2 border-gray-100">
                    <span className="text-sm font-semibold text-gray-700">Sua Comissão:</span>
                    <span className="font-bold text-brand-yellow text-lg">
                      R$ {product.commission.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                {/* Stock */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <i className="fas fa-box"></i>
                  <span>Estoque: {product.stock_quantity} unidades</span>
                </div>

                {/* Copy Link Button */}
                <button
                  onClick={() => copyLink(product.affiliateLink, product.id)}
                  className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                    copiedId === product.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gradient-to-r from-brand-yellow to-yellow-400 text-gray-900 hover:shadow-lg'
                  }`}
                >
                  {copiedId === product.id ? (
                    <>
                      <i className="fas fa-check"></i>
                      <span>Link Copiado!</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-link"></i>
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>

                {/* Affiliate Link (small, below button) */}
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Seu link de afiliado:</p>
                  <p className="text-xs text-gray-700 truncate font-mono">
                    {product.affiliateLink}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center">
            <i className="fas fa-box-open text-6xl text-gray-300 mb-4"></i>
            <p className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum produto encontrado
            </p>
            <p className="text-gray-600">
              Tente ajustar os filtros ou buscar por outro termo
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <i className="fas fa-lightbulb text-white text-xl"></i>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Como usar seus links</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-blue-500 mt-0.5"></i>
                  <span>Copie o link de afiliado do produto que deseja divulgar</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-blue-500 mt-0.5"></i>
                  <span>Compartilhe em suas redes sociais, WhatsApp ou email</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-blue-500 mt-0.5"></i>
                  <span>Quando alguém comprar usando seu link, você ganha a comissão!</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-blue-500 mt-0.5"></i>
                  <span>A comissão é calculada automaticamente com base na sua margem de {session.commissionPercentage}%</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AffiliateLayout>
  );
}
