'use client';

import { useState, useMemo } from 'react';
import { useAffiliate } from '../contexts/AffiliateContext';
import ProductCard from './ProductCard';

export default function CategoryContent({ categoryName, products }) {
  const [sortBy, setSortBy] = useState('relevancia');
  const [priceRange, setPriceRange] = useState([0, 15000]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const affiliate = useAffiliate();

  // Calcular preço máximo dos produtos
  const maxPrice = useMemo(() => {
    if (products.length === 0) return 15000;
    return Math.ceil(Math.max(...products.map(p => p.price || 0)) / 50) * 50 || 15000;
  }, [products]);

  // Filtrar e ordenar produtos
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Filtro de busca por nome
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de preço
    filtered = filtered.filter(p => {
      const price = p.price || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Ordenação
    switch (sortBy) {
      case 'menor-preco':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'maior-preco':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'mais-vendidos':
        filtered.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
        break;
      case 'nome-az':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return filtered;
  }, [products, sortBy, priceRange, searchTerm]);

  const clearFilters = () => {
    setSearchTerm('');
    setPriceRange([0, maxPrice]);
  };

  const hasActiveFilters = searchTerm || priceRange[1] < maxPrice;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Filters */}
        <aside className="lg:w-60 flex-shrink-0">
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden w-full bg-white rounded-lg px-4 py-3 mb-4 flex items-center justify-between border border-gray-200"
          >
            <span className="font-medium text-gray-800 flex items-center gap-2 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Filtros
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
              )}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>

          <div className={`${showFilters ? 'block' : 'hidden'} lg:block space-y-4`}>
            {/* Search */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Buscar</h3>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nome do produto..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors"
                />
              </div>
            </div>

            {/* Price Filter */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Faixa de Preço</h3>
              <input
                type="range"
                min="0"
                max={maxPrice}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: affiliate.brandColor || '#0c0e0b' }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>R$ 0</span>
                <span className="font-medium text-gray-700">até R$ {priceRange[1]}</span>
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full text-sm text-gray-600 font-medium py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {/* Sort Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <p className="text-sm text-gray-500">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'produto' : 'produtos'}
            </p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Ordenar por:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 font-medium text-gray-700 bg-white focus:outline-none focus:border-gray-400 cursor-pointer"
              >
                <option value="relevancia">Mais relevantes</option>
                <option value="mais-vendidos">Mais vendidos</option>
                <option value="menor-preco">Menor preço</option>
                <option value="maior-preco">Maior preço</option>
                <option value="nome-az">A - Z</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                Nenhum produto encontrado
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                Tente ajustar os filtros para encontrar o que procura
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm font-medium px-5 py-2.5 rounded-lg transition-colors text-white"
                  style={{ backgroundColor: affiliate.brandColor || '#0c0e0b' }}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
