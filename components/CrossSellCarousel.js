'use client';

import { useMemo, useState } from 'react';
import { useAffiliate } from '../contexts/AffiliateContext';
import { useCart } from '../contexts/CartContext';
import { buildAxisOptions, findMatchingVariant, pickDefaultVariant } from '../lib/variantSelection';

/**
 * Smart combo suggestion: mostra o produto atual + 1 ou 2 produtos complementares
 * (ex: iPhone + AirPods + Apple Watch), com preço combinado e "adicionar todos ao
 * carrinho" — mesmo quando algum deles tem variação (cor/armazenamento), escolhendo
 * uma combinação padrão sensata na hora pra não travar a compra atrás de "vá até a
 * página do produto escolher".
 */
export default function ComboSuggestion({ currentProduct, suggestedProducts }) {
  const { brandColor } = useAffiliate();
  const { addToCart } = useCart();

  const items = useMemo(() => {
    const list = [currentProduct, ...(suggestedProducts || [])].filter(Boolean);
    return list.map(product => ({
      product,
      axisOptions: product.hasVariants ? buildAxisOptions(product.variants || []) : [],
    }));
  }, [currentProduct, suggestedProducts]);

  const [selections, setSelections] = useState(() => {
    const initial = {};
    items.forEach(({ product }) => {
      if (product.hasVariants) {
        const defaultVariant = pickDefaultVariant(product.variants || []);
        initial[product.id] = defaultVariant ? { ...defaultVariant.attributes } : {};
      }
    });
    return initial;
  });

  if (items.length < 2) return null;

  const selectAttribute = (productId, axisName, value) => {
    setSelections(prev => ({
      ...prev,
      [productId]: { ...prev[productId], [axisName]: value },
    }));
  };

  const resolveItem = ({ product }) => {
    if (!product.hasVariants) {
      const price = product.displayPrice ?? product.pixPrice ?? product.price ?? 0;
      return { product, variant: null, price, available: true };
    }
    const variants = product.variants || [];
    const selectedAttrs = selections[product.id] || {};
    const variant = variants.length > 0 ? findMatchingVariant(variants, selectedAttrs) : null;
    const available = !!(variant && variant.stockQuantity > 0);
    return { product, variant, price: variant?.pixPrice ?? 0, available };
  };

  const resolvedItems = items.map(resolveItem);
  const comboTotal = resolvedItems.reduce((sum, r) => sum + (r.price || 0), 0);
  const canAddComboDirectly = resolvedItems.every(r => r.available);

  const handleAddAll = () => {
    if (!canAddComboDirectly) return;
    resolvedItems.forEach(({ product, variant, price }) => {
      if (variant) {
        addToCart({
          ...product,
          name: `${product.name} — ${Object.values(variant.attributes).join(', ')}`,
          price: variant.pixPrice,
          pixPrice: variant.pixPrice,
          cardPrice: variant.cardPrice,
          costPrice: variant.costPrice,
          costCurrency: variant.costCurrency ?? product.costCurrency,
          importTaxPercentage: variant.importTaxPercentage ?? product.importTaxPercentage,
          supplierMarginPercentage: variant.supplierMarginPercentage ?? product.supplierMarginPercentage,
          installmentValue: variant.installmentValue,
          image_url: variant.imageUrl || product.image_url,
          image: variant.imageUrl || product.image_url,
          variantId: variant.id,
          sku: variant.sku,
          attributes: variant.attributes,
        });
      } else {
        addToCart({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price,
          image: product.image_url || product.image,
          image_url: product.image_url || product.image,
        });
      }
    });
  };

  return (
    <section className="mt-12 md:mt-16">
      <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-5">Combine com</h3>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-4">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4 md:gap-3 min-w-0">
            {resolvedItems.map((resolved, index) => (
              <div key={resolved.product.id} className="flex items-center gap-4 md:gap-3 min-w-0">
                {index > 0 && (
                  <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                )}
                <ComboItem
                  resolved={resolved}
                  label={index === 0 ? 'Este produto' : 'Sugestão'}
                  brandColor={brandColor}
                  selectedAttrs={selections[resolved.product.id] || {}}
                  onSelectAttribute={(axisName, value) => selectAttribute(resolved.product.id, axisName, value)}
                  axisOptions={items[index].axisOptions}
                />
              </div>
            ))}
          </div>

          <div className="hidden md:block w-px h-24 bg-gray-200 mx-1 flex-shrink-0" />

          <div className="flex-shrink-0 text-center md:text-right pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
              Leve os {resolvedItems.length} por
            </p>
            <p className="text-2xl font-bold" style={{ color: brandColor || '#0c0e0b' }}>
              R$ {comboTotal.toFixed(2).replace('.', ',')}
            </p>
            {canAddComboDirectly ? (
              <button
                onClick={handleAddAll}
                className="mt-3 w-full md:w-auto px-6 py-2.5 rounded-lg text-white text-sm font-bold transition-all duration-200 hover:brightness-110 hover:shadow-md active:scale-[0.97]"
                style={{ backgroundColor: brandColor || '#0c0e0b' }}
              >
                <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Adicionar os {resolvedItems.length}
              </button>
            ) : (
              <p className="mt-3 text-xs text-gray-500 max-w-[200px] md:ml-auto">
                Combinação indisponível — tente outra opção acima
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ComboItem({ resolved, label, brandColor, selectedAttrs, onSelectAttribute, axisOptions }) {
  const { product, price, available } = resolved;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <a href={`/produto/${product.slug}`} className="flex-shrink-0">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
          <img
            src={resolved.variant?.imageUrl || product.image_url || product.image}
            alt={product.name}
            className="w-full h-full object-contain p-2"
          />
        </div>
      </a>
      <div className="min-w-0">
        <p className={`text-xs uppercase tracking-wide font-medium mb-0.5 ${label === 'Este produto' ? 'text-gray-400' : 'text-green-600'}`}>
          {label}
        </p>
        <a href={`/produto/${product.slug}`} className="hover:underline">
          <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
            {product.name}
          </h4>
        </a>

        {axisOptions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {axisOptions.map(axis => (
              <div key={axis.name} className="flex flex-wrap gap-1">
                {axis.values.map(value => {
                  const isSelected = selectedAttrs[axis.name] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onSelectAttribute(axis.name, value)}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors"
                      style={isSelected
                        ? { backgroundColor: brandColor || '#0c0e0b', borderColor: brandColor || '#0c0e0b', color: '#ffffff' }
                        : { borderColor: '#e5e7eb', color: '#4b5563' }}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <p className="text-base font-bold mt-1.5" style={{ color: brandColor || '#0c0e0b' }}>
          {available ? `R$ ${price.toFixed(2).replace('.', ',')}` : 'Indisponível'}
        </p>
      </div>
    </div>
  );
}
