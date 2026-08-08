'use client';

import { useState } from 'react';
import { useAffiliate } from '../contexts/AffiliateContext';

export default function ProductInfo({ product, children }) {
  const { brandColor } = useAffiliate();
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  const handleShare = async (platform) => {
    const url = window.location.href;
    const text = `Confira ${product.name} - R$ ${product.price.toFixed(2).replace('.', ',')}`;

    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      copy: url
    };

    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copiado para a área de transferência!');
      } catch (err) {
        console.error('Erro ao copiar:', err);
      }
    } else {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }

    setShareMenuOpen(false);
  };

  return (
    <div className="fade-in-section">
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          {product.name}
        </h2>
        <div className="flex items-center gap-4 pl-4">
          <div className="relative">
            <button
              onClick={() => setShareMenuOpen(!shareMenuOpen)}
              title="Compartilhar"
              className="text-gray-500 hover:transition-colors"
              onMouseEnter={(e) => e.currentTarget.style.color = brandColor}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
            >
              <i className="fas fa-share-alt fa-lg"></i>
            </button>

            {shareMenuOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 py-2 w-48 z-50">
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <i className="fab fa-whatsapp text-green-500 text-lg"></i>
                  <span className="text-sm font-medium">WhatsApp</span>
                </button>
                <button
                  onClick={() => handleShare('facebook')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <i className="fab fa-facebook text-blue-600 text-lg"></i>
                  <span className="text-sm font-medium">Facebook</span>
                </button>
                <button
                  onClick={() => handleShare('twitter')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <i className="fab fa-twitter text-blue-400 text-lg"></i>
                  <span className="text-sm font-medium">Twitter</span>
                </button>
                <button
                  onClick={() => handleShare('telegram')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <i className="fab fa-telegram text-blue-500 text-lg"></i>
                  <span className="text-sm font-medium">Telegram</span>
                </button>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={() => handleShare('copy')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <i className="fas fa-link text-gray-600 text-lg"></i>
                  <span className="text-sm font-medium">Copiar Link</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center mb-4">
        {product.reviews > 0 ? (
          <>
            <div style={{ color: brandColor }}>
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
            <span className="text-gray-600 ml-2">
              {product.rating?.toFixed(1)} · {product.reviews} avaliaç{product.reviews === 1 ? 'ão' : 'ões'}
            </span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            <i className="fas fa-star"></i>
            Novo · seja o primeiro a avaliar
          </span>
        )}
      </div>

      {children}
    </div>
  );
}
