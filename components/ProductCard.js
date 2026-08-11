'use client';

import { useAffiliate } from '../contexts/AffiliateContext';
import { useCart } from '../contexts/CartContext';

export default function ProductCard({ product, layout = 'grid' }) {
  const { brandColor } = useAffiliate();
  const { addToCart } = useCart();

  const displayPrice = product.displayPrice || product.pixPrice || product.price || 0;
  const cardPrice = product.cardPrice || displayPrice;
  const hasDiscount = cardPrice > displayPrice && (cardPrice - displayPrice) > 0.01;
  const discountPercent = hasDiscount ? Math.round(((cardPrice - displayPrice) / cardPrice) * 100) : 0;
  const hasVariants = product.hasVariants || product.has_variants;
  const isIphone = (product.category || '').toLowerCase() === 'iphone';

  const handleAddToCart = (e) => {
    // Produtos com variações (cor/armazenamento/versão) não têm um SKU único para
    // adicionar direto do card — o botão leva para a página do produto escolher a opção.
    if (hasVariants) return;

    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: displayPrice,
      pixPrice: product.pixPrice || displayPrice,
      cardPrice: product.cardPrice || displayPrice,
      costPrice: product.costPrice || product.cost_price || null,
      supplierMarginPercentage: product.supplierMarginPercentage || product.supplier_margin_percentage || null,
      image: product.image_url || product.image,
      image_url: product.image_url || product.image,
    });
  };

  const productUrl = `/produto/${product.slug}`;

  return (
    <div className="group bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-300 flex flex-col h-full">
      <a href={productUrl} className="flex-1 flex flex-col">
        {/* Image Area */}
        <div className="relative bg-gray-50 aspect-square overflow-hidden">
          <img
            src={product.image_url || product.image}
            alt={product.name}
            className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />

          {/* Discount Badge */}
          {hasDiscount && (
            <span className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
              -{discountPercent}% OFF
            </span>
          )}

          {/* Hover overlay - "Ver Produto" */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center pointer-events-none">
            <span className="bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-semibold px-4 py-2 rounded-full shadow-md opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 delay-75">
              Ver Produto
            </span>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-3.5 flex-1 flex flex-col gap-1.5">
          {/* Brand */}
          {product.brand && (
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
              {product.brand}
            </span>
          )}

          {/* Name */}
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug min-h-[2.5rem]">
            {product.name}
          </h3>

          {/* Pricing */}
          <div className="mt-auto pt-2">
            {hasDiscount && (
              <p className="text-xs text-gray-400 line-through">
                R$ {cardPrice.toFixed(2).replace('.', ',')}
              </p>
            )}
            {hasVariants && (
              <p className="text-[11px] text-gray-500">a partir de</p>
            )}
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold" style={{ color: brandColor || '#0c0e0b' }}>
                R$ {displayPrice.toFixed(2).replace('.', ',')}
              </span>
              {hasDiscount && (
                <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                  no PIX
                </span>
              )}
            </div>
            {cardPrice > displayPrice && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                ou R$ {cardPrice.toFixed(2).replace('.', ',')} no cartão
              </p>
            )}
            {isIphone && (
              <p className="text-[11px] font-semibold text-blue-700 mt-1">
                🎁 Capinha e película de brinde
              </p>
            )}
          </div>
        </div>
      </a>

      {/* VER OPÇÕES button bar */}
      {hasVariants ? (
        <a
          href={productUrl}
          className="w-full flex items-center justify-between px-4 py-3 text-white text-sm font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
          style={{ backgroundColor: brandColor || '#0c0e0b' }}
        >
          <span>VER OPÇÕES</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </a>
      ) : (
        <button
          onClick={handleAddToCart}
          className="w-full flex items-center justify-between px-4 py-3 text-white text-sm font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
          style={{ backgroundColor: brandColor || '#0c0e0b' }}
        >
          <span>VER OPÇÕES</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </button>
      )}
    </div>
  );
}
