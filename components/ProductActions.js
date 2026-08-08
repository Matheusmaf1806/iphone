'use client';

import { useMemo, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAffiliate } from '../contexts/AffiliateContext';

// Agrupa os atributos de todas as variantes em eixos (ex: Versão, Cor, Armazenamento),
// na ordem em que aparecem, para desenhar um seletor por eixo.
function buildAxisOptions(variants) {
  const order = [];
  const values = {};
  variants.forEach(v => {
    Object.entries(v.attributes || {}).forEach(([key, value]) => {
      if (!values[key]) {
        values[key] = [];
        order.push(key);
      }
      if (!values[key].includes(value)) values[key].push(value);
    });
  });
  return order.map(name => ({ name, values: values[name] }));
}

function findMatchingVariant(variants, selected) {
  return variants.find(v => Object.entries(selected).every(([key, value]) => v.attributes[key] === value)) || null;
}

export default function ProductActions({ product }) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart: addToCartContext, setIsOpen } = useCart();
  const affiliate = useAffiliate();

  const hasVariants = !!(product.hasVariants && product.variants && product.variants.length > 0);
  const axisOptions = useMemo(() => (hasVariants ? buildAxisOptions(product.variants) : []), [hasVariants, product.variants]);

  const initialAttributes = useMemo(() => {
    if (!hasVariants) return {};
    const preferred =
      product.variants.find(v => v.isDefault) ||
      product.variants.find(v => v.stockQuantity > 0) ||
      product.variants[0];
    return preferred?.attributes || {};
  }, [hasVariants, product.variants]);

  const [selectedAttributes, setSelectedAttributes] = useState(initialAttributes);

  const selectedVariant = hasVariants ? findMatchingVariant(product.variants, selectedAttributes) : null;
  const incompleteSelection = hasVariants && !selectedVariant;
  const outOfStock = !!(selectedVariant && selectedVariant.stockQuantity <= 0);
  const canAddToCart = hasVariants ? !!(selectedVariant && !outOfStock) : true;

  const selectAttribute = (axisName, value) => {
    setSelectedAttributes(prev => ({ ...prev, [axisName]: value }));
  };

  const changeQuantity = (amount) => {
    const newValue = quantity + amount;
    if (newValue >= 1) {
      setQuantity(newValue);
    }
  };

  const displayPrice = hasVariants ? (selectedVariant?.pixPrice ?? null) : product.price;
  const displayInstallmentValue = hasVariants ? (selectedVariant?.installmentValue ?? null) : null;

  const addToCart = () => {
    if (!canAddToCart) return;

    const cartProduct = hasVariants
      ? {
          ...product,
          price: selectedVariant.pixPrice,
          pixPrice: selectedVariant.pixPrice,
          cardPrice: selectedVariant.cardPrice,
          costPrice: selectedVariant.costPrice,
          supplierMarginPercentage: selectedVariant.supplierMarginPercentage ?? product.supplierMarginPercentage,
          installmentValue: selectedVariant.installmentValue,
          image_url: selectedVariant.imageUrl || product.image_url,
          image: selectedVariant.imageUrl || product.image_url,
          variantId: selectedVariant.id,
          sku: selectedVariant.sku,
          attributes: selectedVariant.attributes,
        }
      : product;

    addToCartContext(cartProduct, quantity);

    setTimeout(() => {
      setIsOpen(true);
    }, 100);
  };

  const totalPrice = (displayPrice || 0) * quantity;
  const installmentValue = totalPrice / (product.installments || 1);

  return (
    <>
      {hasVariants && (
        <div className="mb-6 space-y-4">
          {axisOptions.map(axis => (
            <div key={axis.name}>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                {axis.name}
                {selectedAttributes[axis.name] && (
                  <span className="font-normal text-gray-500"> — {selectedAttributes[axis.name]}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {axis.values.map(value => {
                  const isSelected = selectedAttributes[axis.name] === value;
                  const swatchHex = product.variantSwatches?.[axis.name]?.[value];
                  const wouldMatch = findMatchingVariant(product.variants, { ...selectedAttributes, [axis.name]: value });
                  const disabled = !wouldMatch;
                  const isSoldOut = wouldMatch && wouldMatch.stockQuantity <= 0;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => !disabled && selectAttribute(axis.name, value)}
                      disabled={disabled}
                      title={isSoldOut ? `${value} — esgotado` : value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        isSelected
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : disabled
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-gray-300 text-gray-700 hover:border-gray-500'
                      } ${isSoldOut && !isSelected ? 'opacity-50' : ''}`}
                    >
                      {swatchHex && (
                        <span
                          className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                          style={{ backgroundColor: swatchHex }}
                        />
                      )}
                      {value}
                      {isSoldOut && <span className="text-xs">(esgotado)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preço dinâmico */}
      <div className="mb-6">
        {incompleteSelection ? (
          <p className="text-lg text-gray-500">Selecione as opções acima para ver o preço</p>
        ) : (
          <>
            <p className="text-4xl font-bold text-gray-900 mb-2">
              R$ {totalPrice.toFixed(2).replace('.', ',')}
            </p>
            {product.installments > 1 && (
              <p className="text-sm text-gray-600">
                ou em até{' '}
                <span className="font-bold">
                  {product.installments}x de R${' '}
                  {installmentValue.toFixed(2).replace('.', ',')}
                </span>{' '}
                sem juros
              </p>
            )}
            {quantity > 1 && (
              <p className="text-sm text-gray-500 mt-1">
                {quantity}x R$ {(displayPrice || 0).toFixed(2).replace('.', ',')} por unidade
              </p>
            )}
            {outOfStock && (
              <p className="text-sm font-semibold text-red-600 mt-2">Esgotado nessa combinação</p>
            )}
          </>
        )}
      </div>

      <div className="mb-4">
        <label
          htmlFor="quantity"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Quantidade
        </label>
        <div className="flex rounded-lg shadow-md overflow-hidden">
          {/* Quantity Selector */}
          <div className="flex items-center border border-r-0 border-gray-300 bg-white rounded-l-lg">
            <button
              onClick={() => changeQuantity(-1)}
              className="px-4 h-full text-lg font-semibold text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
            >
              -
            </button>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="quantity-input w-16 text-center bg-transparent text-gray-900 font-bold text-lg focus:outline-none h-full border-l border-r border-gray-300"
            />
            <button
              onClick={() => changeQuantity(1)}
              className="px-4 h-full text-lg font-semibold text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
            >
              +
            </button>
          </div>
          {/* Add to Cart Button */}
          <button
            onClick={addToCart}
            disabled={!canAddToCart}
            className="flex-grow font-bold text-base py-3 px-6 transition-all action-button rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: affiliate.buttonColor || '#0043f7',
              color: affiliate.buttonTextColor || '#0c0e0b',
            }}
            onMouseEnter={(e) => {
              if (canAddToCart) e.currentTarget.style.backgroundColor = affiliate.buttonHover || '#0036c6';
            }}
            onMouseLeave={(e) => {
              if (canAddToCart) e.currentTarget.style.backgroundColor = affiliate.buttonColor || '#0043f7';
            }}
          >
            {outOfStock ? 'Esgotado' : incompleteSelection ? 'Escolha as opções' : 'Adicionar ao Carrinho'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <button
          disabled={!canAddToCart}
          className="w-full bg-brand-dark font-bold py-3 px-6 rounded-lg shadow-md hover:opacity-90 transition-all transform hover:scale-105 action-button disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          style={{ color: affiliate.buttonColor || '#0043f7' }}
        >
          Comprar Agora
        </button>
      </div>

      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <i className="fas fa-plane-departure text-sm"></i>
          Retirada em Orlando
        </h3>
        <p className="text-sm text-gray-600">
          Não há entrega no Brasil. Você escolhe a data prevista da sua viagem no checkout e retira o aparelho
          pessoalmente em Orlando, mediante passaporte e passagem aérea.
        </p>
      </div>
    </>
  );
}
