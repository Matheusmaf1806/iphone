'use client';

import { useAffiliate } from '../contexts/AffiliateContext';
import { useCart } from '../contexts/CartContext';

/**
 * Smart combo suggestion: shows current product + 1 complementary product
 * with combined price and "add both to cart" button.
 */
export default function ComboSuggestion({ currentProduct, suggestedProduct }) {
  const { brandColor } = useAffiliate();
  const { addToCart } = useCart();

  if (!currentProduct || !suggestedProduct) return null;

  const currentPrice = currentProduct.displayPrice || currentProduct.pixPrice || currentProduct.price || 0;
  const suggestedPrice = suggestedProduct.displayPrice || suggestedProduct.pixPrice || suggestedProduct.price || 0;
  const comboTotal = currentPrice + suggestedPrice;

  const handleAddBoth = () => {
    addToCart({
      id: currentProduct.id,
      name: currentProduct.name,
      slug: currentProduct.slug,
      price: currentPrice,
      image: currentProduct.image_url || currentProduct.image,
      image_url: currentProduct.image_url || currentProduct.image,
    });
    addToCart({
      id: suggestedProduct.id,
      name: suggestedProduct.name,
      slug: suggestedProduct.slug,
      price: suggestedPrice,
      image: suggestedProduct.image_url || suggestedProduct.image,
      image_url: suggestedProduct.image_url || suggestedProduct.image,
    });
  };

  return (
    <section className="mt-12 md:mt-16">
      <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-5">Combine com</h3>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">

          {/* Current product */}
          <div className="flex-1 flex items-center gap-4 min-w-0">
            <a href={`/produto/${currentProduct.slug}`} className="flex-shrink-0">
              <div className="w-24 h-24 md:w-28 md:h-28 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                <img
                  src={currentProduct.image_url || currentProduct.image}
                  alt={currentProduct.name}
                  className="w-full h-full object-contain p-2"
                />
              </div>
            </a>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Este produto</p>
              <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                {currentProduct.name}
              </h4>
              <p className="text-base font-bold mt-1.5" style={{ color: brandColor || '#0c0e0b' }}>
                R$ {currentPrice.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>

          {/* Plus icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
          </div>

          {/* Suggested product */}
          <div className="flex-1 flex items-center gap-4 min-w-0">
            <a href={`/produto/${suggestedProduct.slug}`} className="flex-shrink-0">
              <div className="w-24 h-24 md:w-28 md:h-28 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden group">
                <img
                  src={suggestedProduct.image_url || suggestedProduct.image}
                  alt={suggestedProduct.name}
                  className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </a>
            <div className="min-w-0">
              <p className="text-xs text-green-600 uppercase tracking-wide font-medium mb-0.5">Sugestão</p>
              <a href={`/produto/${suggestedProduct.slug}`} className="hover:underline">
                <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                  {suggestedProduct.name}
                </h4>
              </a>
              <p className="text-base font-bold mt-1.5" style={{ color: brandColor || '#0c0e0b' }}>
                R$ {suggestedPrice.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>

          {/* Equals / total + CTA */}
          <div className="flex-shrink-0 w-full md:w-auto">
            <div className="hidden md:block w-px h-20 bg-gray-200 mx-2" />
          </div>

          <div className="flex-shrink-0 text-center md:text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Leve os 2 por</p>
            <p className="text-2xl font-bold" style={{ color: brandColor || '#0c0e0b' }}>
              R$ {comboTotal.toFixed(2).replace('.', ',')}
            </p>
            <button
              onClick={handleAddBoth}
              className="mt-3 w-full md:w-auto px-6 py-2.5 rounded-lg text-white text-sm font-bold transition-all duration-200 hover:brightness-110 hover:shadow-md active:scale-[0.97]"
              style={{ backgroundColor: brandColor || '#0c0e0b' }}
            >
              <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Adicionar os 2
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
