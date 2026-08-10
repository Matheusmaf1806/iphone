'use client';

import { useMemo } from 'react';
import { useAffiliate } from '../contexts/AffiliateContext';
import { useCart } from '../contexts/CartContext';
import { pickDefaultVariant } from '../lib/variantSelection';

/**
 * Smart combo suggestion: mostra o produto atual + 1 ou 2 produtos complementares
 * (ex: iPhone + AirPods + Apple Watch), com preço combinado e "adicionar todos ao
 * carrinho" — mesmo quando algum deles tem variação (cor/armazenamento), uma
 * combinação padrão já vem escolhida (a marcada como padrão, ou a primeira com
 * estoque) em vez de empilhar seletor de cada atributo no card.
 */
export default function ComboSuggestion({ currentProduct, currentVariant, suggestedProducts }) {
  const { brandColor } = useAffiliate();
  const { addToCart } = useCart();

  const resolvedItems = useMemo(() => {
    const list = [currentProduct, ...(suggestedProducts || [])].filter(Boolean);
    return list.map((product, index) => {
      if (!product.hasVariants) {
        const price = product.displayPrice ?? product.pixPrice ?? product.price ?? 0;
        return { product, variant: null, price, available: true };
      }
      // Pro produto que o cliente já está vendo (primeiro item), usa a variante que
      // ele escolheu na tela em vez de uma padrão qualquer — senão "Adicionar os N"
      // pode colocar no carrinho uma cor/armazenamento diferente do que ele decidiu.
      const variant = (index === 0 && currentVariant) ? currentVariant : pickDefaultVariant(product.variants || []);
      const available = !!(variant && variant.stockQuantity > 0);
      return { product, variant, price: variant?.pixPrice ?? 0, available };
    });
  }, [currentProduct, currentVariant, suggestedProducts]);

  if (resolvedItems.length < 2) return null;

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
        // Sem variação: manda o produto como veio (já carrega costPrice/costCurrency/
        // importTaxPercentage/supplierMarginPercentage de applyPrices), mesmo padrão
        // usado pelo caminho simples de ProductActions.buildCartProduct().
        addToCart({
          ...product,
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
                <ComboItem resolved={resolved} label={index === 0 ? 'Este produto' : 'Sugestão'} brandColor={brandColor} />
              </div>
            ))}
          </div>

          <div className="hidden md:block w-px h-20 bg-gray-200 mx-1 flex-shrink-0" />

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
                Indisponível no momento
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ComboItem({ resolved, label, brandColor }) {
  const { product, variant, price, available } = resolved;
  const attributesLabel = variant ? Object.values(variant.attributes).join(' • ') : null;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <a href={`/produto/${product.slug}`} className="flex-shrink-0">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
          <img
            src={variant?.imageUrl || product.image_url || product.image}
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
        {attributesLabel && (
          <p className="text-xs text-gray-500 mt-0.5">{attributesLabel}</p>
        )}
        <p className="text-base font-bold mt-1.5" style={{ color: brandColor || '#0c0e0b' }}>
          {available ? `R$ ${price.toFixed(2).replace('.', ',')}` : 'Indisponível'}
        </p>
      </div>
    </div>
  );
}
