'use client';
import { useAffiliate } from '../contexts/AffiliateContext';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Loader from './Loader';

export default function SearchBar() {
  const [searchTerm, setSearchTerm] = useState('');
  const affiliate = useAffiliate();
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null);
  const router = useRouter();

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Buscar produtos ao digitar
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(searchTerm.trim())}`);
        const data = await response.json();
        if (data.success && data.data) {
          setResults(data.data.map(p => ({
            slug: p.slug,
            name: p.name,
            price: p.price || p.pixPrice || 0,
            image: p.image_url || '',
            category: p.category || '',
          })));
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      }
      setIsOpen(true);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchTerm)}`);
      setIsOpen(false);
    }
  };

  const handleProductClick = (slug) => {
    router.push(`/produto/${slug}`);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-xl">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar iPhone, Mac, iPad, AirPods..."
          className="w-full py-3 px-5 pr-12 rounded-full border-2 border-gray-300 focus:outline-none transition-colors"
          onFocus={(e) => e.target.style.borderColor = affiliate.buttonColor || '#0043f7'}
          onBlur={(e) => e.target.style.borderColor = 'rgb(209 213 219)'}
        />
        <button
          type="submit"
          className="absolute right-1 top-1/2 -translate-y-1/2 text-white rounded-full p-2 hover:opacity-90 transition-colors"
          style={{ backgroundColor: affiliate.buttonColor || '#0043f7' }}
        >
          {isLoading ? (
            <Loader size="xs" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </button>
      </form>

      {/* Dropdown de Resultados */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-6 text-center">
              <i className="fas fa-search text-4xl text-gray-300 mb-3"></i>
              <p className="text-gray-500">Nenhum produto encontrado</p>
              <p className="text-gray-400 text-sm mt-1">
                Tente buscar por outro termo
              </p>
            </div>
          ) : (
            <div className="py-2">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-sm text-gray-600">
                  {results.length} {results.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
                </p>
              </div>
              {results.map((product) => (
                <button
                  key={product.slug}
                  onClick={() => handleProductClick(product.slug)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  {/* Image */}
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded"
                  />

                  {/* Info */}
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-500">{product.category}</p>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="text-lg font-bold " style={{ color: affiliate.buttonColor || '#0043f7' }}>
                      R$ {product.price.toFixed(2).replace('.', ',')}
                    </p>
                  </div>

                  {/* Arrow */}
                  <i className="fas fa-chevron-right text-gray-400"></i>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
