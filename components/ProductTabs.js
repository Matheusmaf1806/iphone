'use client';
import { useAffiliate } from '../contexts/AffiliateContext';

import { useState } from 'react';

export default function ProductTabs({ product }) {
  const [activeTab, setActiveTab] = useState('description');
  const affiliate = useAffiliate();

  const hasDetails = product.details && Object.keys(product.details).length > 0;

  return (
    <div className="mt-16 md:mt-24 border-t border-gray-200 pt-12 fade-in-section">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-center border-b border-gray-200 mb-8">
          <button
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'description'
                ? 'border-custom-yellow text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('description')}
          >
            Descrição
          </button>
          <button
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'reviews'
                ? 'border-custom-yellow text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('reviews')}
          >
            Avaliações ({product.reviews || 0})
          </button>
        </div>

        {activeTab === 'description' && (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              {product.name}
            </h3>

            {/* Full description */}
            {product.description ? (
              <div className="text-gray-600 whitespace-pre-line leading-relaxed">
                {product.description}
              </div>
            ) : (
              <p className="text-gray-400 italic">
                Nenhuma descrição disponível para este produto.
              </p>
            )}

            {/* Product details/specs */}
            {hasDetails && (
              <ul className="list-disc list-inside text-gray-600 mt-6 space-y-2">
                {Object.entries(product.details).map(([key, value]) => (
                  <li key={key}>
                    <strong className="capitalize">{key.replace(/_/g, ' ')}:</strong> {value}
                  </li>
                ))}
              </ul>
            )}

            {/* Specs from product fields */}
            {(product.weight || product.height || product.width || product.depth) && (
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3 text-sm">Especificações</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {product.weight && (
                    <div>
                      <span className="text-gray-500">Peso</span>
                      <p className="font-medium text-gray-800">{product.weight}g</p>
                    </div>
                  )}
                  {product.height && (
                    <div>
                      <span className="text-gray-500">Altura</span>
                      <p className="font-medium text-gray-800">{product.height}cm</p>
                    </div>
                  )}
                  {product.width && (
                    <div>
                      <span className="text-gray-500">Largura</span>
                      <p className="font-medium text-gray-800">{product.width}cm</p>
                    </div>
                  )}
                  {product.depth && (
                    <div>
                      <span className="text-gray-500">Profundidade</span>
                      <p className="font-medium text-gray-800">{product.depth}cm</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="text-center">
                <p className="text-5xl font-bold" style={{ color: affiliate.buttonColor || '#0071e3' }}>
                  {product.rating || 0}
                </p>
                <div className="mt-2" style={{ color: affiliate.buttonColor || '#0071e3' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <i
                      key={star}
                      className={`fas ${
                        star <= Math.floor(product.rating || 0)
                          ? 'fa-star'
                          : star - 0.5 <= (product.rating || 0)
                          ? 'fa-star-half-alt'
                          : 'fa-star text-gray-300'
                      }`}
                    ></i>
                  ))}
                </div>
                <p className="text-gray-600 mt-1">
                  Baseado em {product.reviews || 0} avaliações
                </p>
              </div>
            </div>

            {(!product.reviews || product.reviews === 0) && (
              <div className="mt-8 pt-8 border-t border-gray-200 text-center">
                <p className="text-gray-500">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
