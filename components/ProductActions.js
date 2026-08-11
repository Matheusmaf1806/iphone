'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../contexts/CartContext';
import { useAffiliate } from '../contexts/AffiliateContext';
import { buildAxisOptions, findMatchingVariant, pickDefaultVariant } from '../lib/variantSelection';

export default function ProductActions({ product, onVariantChange }) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart: addToCartContext, setIsOpen } = useCart();
  const affiliate = useAffiliate();
  const router = useRouter();

  // Acessórios compatíveis curados no admin (ex: Apple Pencil Pro pro iPad Pro) —
  // cada um resolve pra sua variante padrão (cor/config mais comum), igual ao
  // combo "Combine com" faz, já que aqui também não faz sentido pedir pro
  // cliente configurar o acessório inteiro só pra marcar um checkbox.
  const accessories = useMemo(() => {
    return (product.accessories || []).map(({ isDefaultChecked, product: accessoryProduct }) => {
      if (!accessoryProduct.hasVariants) {
        const price = accessoryProduct.displayPrice ?? accessoryProduct.pixPrice ?? accessoryProduct.price ?? 0;
        return { product: accessoryProduct, variant: null, price, available: true, isDefaultChecked };
      }
      const variant = pickDefaultVariant(accessoryProduct.variants || []);
      const available = !!(variant && variant.stockQuantity > 0);
      return { product: accessoryProduct, variant, price: variant?.pixPrice ?? 0, available, isDefaultChecked };
    });
  }, [product.accessories]);

  const [selectedAccessoryIds, setSelectedAccessoryIds] = useState(() => {
    const initial = new Set();
    (product.accessories || []).forEach(({ isDefaultChecked, product: accessoryProduct }) => {
      if (isDefaultChecked) initial.add(accessoryProduct.id);
    });
    return initial;
  });

  const toggleAccessory = (accessoryId) => {
    setSelectedAccessoryIds(prev => {
      const next = new Set(prev);
      if (next.has(accessoryId)) next.delete(accessoryId);
      else next.add(accessoryId);
      return next;
    });
  };

  // Importante: isVariantProduct olha só a flag do produto, não se sobrou alguma
  // variante depois dos filtros de preço — um produto marcado como "tem variações"
  // NUNCA pode cair no fluxo de compra simples, mesmo que hoje não haja nenhum SKU
  // disponível pra vender (aí é "indisponível", não "compra sem escolher variante").
  const isVariantProduct = !!product.hasVariants;
  const availableVariants = product.variants || [];
  const hasSelectableVariants = isVariantProduct && availableVariants.length > 0;

  const axisOptions = useMemo(() => (isVariantProduct ? buildAxisOptions(availableVariants) : []), [isVariantProduct, availableVariants]);

  // Seleção começa vazia de propósito: o cliente escolhe um eixo de cada vez (ex:
  // Cor primeiro) e só então as opções do próximo eixo (ex: Armazenamento) aparecem,
  // já filtradas pelo que é realmente possível combinar — em vez de mostrar tudo de
  // uma vez com estoque calculado a partir de "qualquer variante que bater parcialmente",
  // que podia marcar uma cor como esgotada mesmo com outra capacidade disponível nela.
  const [selectedAttributes, setSelectedAttributes] = useState({});

  // Só considera "selecionado" quando TODOS os eixos já têm valor escolhido — com
  // seleção vazia, um match "vazio" (every() sobre objeto sem chaves) bateria com a
  // primeira variante da lista sem o cliente ter escolhido nada.
  const allAxesAnswered = hasSelectableVariants && axisOptions.every(a => selectedAttributes[a.name] !== undefined);
  const selectedVariant = allAxesAnswered ? findMatchingVariant(availableVariants, selectedAttributes) : null;
  const incompleteSelection = isVariantProduct && !selectedVariant;
  const outOfStock = !!(selectedVariant && selectedVariant.stockQuantity <= 0);
  const canAddToCart = isVariantProduct ? !!(selectedVariant && !outOfStock) : true;

  // Variantes ainda compatíveis com o que já foi escolhido (mesmo com a seleção
  // incompleta) — usado pra mostrar "a partir de R$X" desde o primeiro momento em vez
  // de esconder qualquer preço até a combinação inteira estar resolvida.
  const reachableVariantsNow = useMemo(() => {
    if (!hasSelectableVariants) return [];
    return availableVariants.filter(v =>
      Object.entries(selectedAttributes).every(([key, value]) => v.attributes[key] === value)
    );
  }, [hasSelectableVariants, availableVariants, selectedAttributes]);

  const minReachablePrice = useMemo(() => {
    const priced = reachableVariantsNow.filter(v => v.pixPrice != null);
    return priced.length > 0 ? Math.min(...priced.map(v => v.pixPrice)) : null;
  }, [reachableVariantsNow]);

  // Estoque real do que está selecionado agora (SKU exato quando resolvido, ou o
  // produto simples) — usado pra não deixar escolher mais unidades do que existe.
  const maxQuantity = isVariantProduct
    ? (selectedVariant ? selectedVariant.stockQuantity : null)
    : (product.manageStock && product.stockQuantity != null && product.stockQuantity >= 0 ? product.stockQuantity : null);

  // Se a variante muda (ou o estoque dela é menor que a quantidade já escolhida),
  // a quantidade se ajusta sozinha em vez de deixar o cliente tentar comprar mais
  // do que existe.
  useEffect(() => {
    if (maxQuantity != null && quantity > Math.max(maxQuantity, 1)) {
      setQuantity(Math.max(maxQuantity, 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxQuantity]);

  // Avisa o componente pai (a galeria de fotos) qual variante está selecionada, pra
  // trocar a foto principal quando o SKU escolhido tiver imagem própria.
  useEffect(() => {
    onVariantChange?.(selectedVariant);
  }, [selectedVariant, onVariantChange]);

  // Escolher um valor limpa qualquer eixo posterior já escolhido — trocar a cor
  // depois de já ter escolhido armazenamento não pode deixar uma combinação inválida
  // "presa" selecionada.
  const selectAttribute = (axisIndex, axisName, value) => {
    setSelectedAttributes(prev => {
      const next = {};
      axisOptions.slice(0, axisIndex).forEach(a => {
        if (prev[a.name] !== undefined) next[a.name] = prev[a.name];
      });
      next[axisName] = value;
      return next;
    });
  };

  const changeQuantity = (amount) => {
    const newValue = quantity + amount;
    if (newValue >= 1 && (maxQuantity == null || newValue <= maxQuantity)) {
      setQuantity(newValue);
    }
  };

  const displayPrice = isVariantProduct ? (selectedVariant?.pixPrice ?? null) : product.pixPrice ?? product.price;
  const displayCardPrice = isVariantProduct ? (selectedVariant?.cardPrice ?? null) : product.cardPrice;
  const hasPixDiscount = displayPrice != null && displayCardPrice != null && (displayCardPrice - displayPrice) > 0.01;
  const pixDiscountPercent = hasPixDiscount ? Math.round(((displayCardPrice - displayPrice) / displayCardPrice) * 100) : 0;
  const isIphone = (product.category || '').toLowerCase() === 'iphone';

  const buildCartProduct = () => (
    isVariantProduct
      ? {
          ...product,
          // O nome já sai com a combinação escolhida (ex: "iPhone 17 Pro Max — Titânio
          // Azul, 256GB") — assim carrinho, checkout e pedido nunca mostram só o nome
          // genérico do produto sem dizer qual SKU foi comprado.
          name: `${product.name} — ${Object.values(selectedVariant.attributes).join(', ')}`,
          price: selectedVariant.pixPrice,
          pixPrice: selectedVariant.pixPrice,
          cardPrice: selectedVariant.cardPrice,
          costPrice: selectedVariant.costPrice,
          costCurrency: selectedVariant.costCurrency ?? product.costCurrency,
          importTaxPercentage: selectedVariant.importTaxPercentage ?? product.importTaxPercentage,
          supplierMarginPercentage: selectedVariant.supplierMarginPercentage ?? product.supplierMarginPercentage,
          installmentValue: selectedVariant.installmentValue,
          image_url: selectedVariant.imageUrl || product.image_url,
          image: selectedVariant.imageUrl || product.image_url,
          variantId: selectedVariant.id,
          sku: selectedVariant.sku,
          attributes: selectedVariant.attributes,
        }
      : product
  );

  // Adiciona ao carrinho os acessórios marcados — sempre 1 unidade cada,
  // independente da quantidade escolhida pro produto principal (igual ao "Add
  // to Bag" da própria Apple: marcar a Pencil não multiplica pela quantidade
  // de iPads).
  const addSelectedAccessoriesToCart = () => {
    accessories.forEach(({ product: accessoryProduct, variant, price, available, isDefaultChecked }) => {
      if (!selectedAccessoryIds.has(accessoryProduct.id) || !available) return;
      if (variant) {
        addToCartContext({
          ...accessoryProduct,
          name: `${accessoryProduct.name} — ${Object.values(variant.attributes).join(', ')}`,
          price: variant.pixPrice,
          pixPrice: variant.pixPrice,
          cardPrice: variant.cardPrice,
          costPrice: variant.costPrice,
          costCurrency: variant.costCurrency ?? accessoryProduct.costCurrency,
          importTaxPercentage: variant.importTaxPercentage ?? accessoryProduct.importTaxPercentage,
          supplierMarginPercentage: variant.supplierMarginPercentage ?? accessoryProduct.supplierMarginPercentage,
          installmentValue: variant.installmentValue,
          image_url: variant.imageUrl || accessoryProduct.image_url,
          image: variant.imageUrl || accessoryProduct.image_url,
          variantId: variant.id,
          sku: variant.sku,
          attributes: variant.attributes,
        }, 1);
      } else {
        addToCartContext({ ...accessoryProduct, price }, 1);
      }
    });
  };

  const addToCart = () => {
    if (!canAddToCart) return;
    addToCartContext(buildCartProduct(), quantity);
    addSelectedAccessoriesToCart();
    setTimeout(() => {
      setIsOpen(true);
    }, 100);
  };

  const buyNow = () => {
    if (!canAddToCart) return;
    addToCartContext(buildCartProduct(), quantity);
    addSelectedAccessoriesToCart();
    router.push('/checkout');
  };

  const totalPrice = (displayPrice || 0) * quantity;
  const installmentValue = totalPrice / (product.installments || 1);

  return (
    <>
      {isVariantProduct && !hasSelectableVariants && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
          <i className="fas fa-circle-exclamation mr-2 text-gray-400"></i>
          Nenhuma opção disponível para este produto no momento.
        </div>
      )}

      {hasSelectableVariants && (
        <div className="mb-6 space-y-5">
          {axisOptions.map((axis, axisIndex) => {
            // O eixo só fica interativo depois que os anteriores já foram escolhidos
            // (é o que filtra as opções — ex: Pulseira só mostra as cores que existem
            // pra aquela Cor de caixa já escolhida). Mas o passo continua VISÍVEL,
            // só travado — sem isso, o cliente não sabe que existe mais coisa pra
            // configurar além do primeiro eixo, e a página parece que só tem "Cor".
            const priorAxes = axisOptions.slice(0, axisIndex);
            const missingPriorAxis = priorAxes.find(a => selectedAttributes[a.name] === undefined);

            if (missingPriorAxis) {
              return (
                <div key={axis.name} className="opacity-40 pointer-events-none select-none">
                  <p className="text-sm font-semibold text-gray-500 mb-2">
                    {axisIndex + 1}. {axis.name}
                  </p>
                  <p className="text-xs text-gray-400">Escolha {missingPriorAxis.name} primeiro</p>
                </div>
              );
            }

            // Candidatas = variantes que já batem com tudo que foi escolhido até aqui.
            const candidateVariants = availableVariants.filter(v =>
              priorAxes.every(a => v.attributes[a.name] === selectedAttributes[a.name])
            );

            // Só valores realmente alcançáveis a partir da escolha anterior entram na
            // lista — nada de mostrar uma opção que não existe pra essa combinação.
            const reachableValues = axis.values.filter(value =>
              candidateVariants.some(v => v.attributes[axis.name] === value)
            );

            const isColorAxis = reachableValues.some(v => product.variantSwatches?.[axis.name]?.[v]);

            return (
              <div key={axis.name}>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {axisIndex + 1}. {axis.name}
                  {selectedAttributes[axis.name] && (
                    <span className="font-normal text-gray-500"> — {selectedAttributes[axis.name]}</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {reachableValues.map(value => {
                    const isSelected = selectedAttributes[axis.name] === value;
                    const swatchHex = product.variantSwatches?.[axis.name]?.[value];
                    // Esgotado de verdade = TODAS as variantes que batem com o que já foi
                    // escolhido + esse valor estão sem estoque (não só a primeira encontrada).
                    const matchingForValue = candidateVariants.filter(v => v.attributes[axis.name] === value);
                    const isSoldOut = matchingForValue.length > 0 && matchingForValue.every(v => v.stockQuantity <= 0);

                    // Preço dessa opção específica, pra comparar antes de clicar — "a
                    // partir de" quando ainda pode virar mais de um SKU, exato quando já
                    // fecha em um só (ex: último eixo).
                    const pricedForValue = matchingForValue.filter(v => v.pixPrice != null);
                    const valueMinPrice = pricedForValue.length > 0 ? Math.min(...pricedForValue.map(v => v.pixPrice)) : null;
                    const priceLabel = valueMinPrice == null ? null : (
                      matchingForValue.length > 1
                        ? `a partir de R$ ${valueMinPrice.toFixed(2).replace('.', ',')}`
                        : `R$ ${valueMinPrice.toFixed(2).replace('.', ',')}`
                    );

                    if (isColorAxis && swatchHex) {
                      return (
                        <div key={value} className="flex flex-col items-center gap-1 w-16">
                          <button
                            type="button"
                            onClick={() => selectAttribute(axisIndex, axis.name, value)}
                            title={isSoldOut ? `${value} — esgotado` : value}
                            className={`relative w-10 h-10 rounded-full flex-shrink-0 transition-all ${
                              isSelected ? 'ring-2 ring-offset-2' : 'ring-1 ring-offset-1 ring-gray-300 hover:ring-gray-500'
                            }`}
                            style={{
                              backgroundColor: swatchHex,
                              ...(isSelected ? { '--tw-ring-color': affiliate.buttonColor || '#0043f7' } : {}),
                            }}
                          >
                            {isSoldOut && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="w-full h-px bg-white rotate-45" />
                              </span>
                            )}
                          </button>
                          {priceLabel && (
                            <span className={`text-[10px] text-center leading-tight ${isSoldOut ? 'text-gray-400' : 'text-gray-500'}`}>
                              {priceLabel}
                            </span>
                          )}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => selectAttribute(axisIndex, axis.name, value)}
                        title={isSoldOut ? `${value} — esgotado` : value}
                        className={`flex flex-col items-start gap-0.5 px-3.5 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          isSelected
                            ? 'text-white'
                            : 'border-gray-300 text-gray-700 hover:border-gray-500'
                        } ${isSoldOut && !isSelected ? 'opacity-50' : ''}`}
                        style={isSelected ? {
                          borderColor: affiliate.buttonColor || '#0043f7',
                          backgroundColor: affiliate.buttonColor || '#0043f7',
                          color: affiliate.buttonTextColor || '#ffffff',
                        } : undefined}
                      >
                        <span>{value}{isSoldOut && <span className="text-xs ml-1">(esgotado)</span>}</span>
                        {priceLabel && (
                          <span className={`text-[11px] font-normal ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                            {priceLabel}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preço dinâmico */}
      <div className="mb-6">
        {incompleteSelection ? (
          hasSelectableVariants ? (
            <div>
              {minReachablePrice != null && (
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  A partir de R$ {minReachablePrice.toFixed(2).replace('.', ',')}
                  <span className="text-base font-normal text-gray-500 ml-2">no PIX</span>
                </p>
              )}
              <p className="text-sm text-gray-500">Escolha as opções acima para ver o preço exato</p>
            </div>
          ) : (
            <p className="text-lg text-gray-500">Produto indisponível no momento</p>
          )
        ) : (
          <>
            {hasPixDiscount && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full mb-2">
                <i className="fas fa-bolt"></i>
                {pixDiscountPercent}% de desconto pagando no PIX
              </span>
            )}
            <p className="text-4xl font-bold text-gray-900 mb-1">
              R$ {totalPrice.toFixed(2).replace('.', ',')}
              <span className="text-base font-normal text-gray-500 ml-2">no PIX</span>
            </p>
            {hasPixDiscount && (
              <p className="text-sm text-gray-500">
                ou R$ {(displayCardPrice * quantity).toFixed(2).replace('.', ',')} no cartão
              </p>
            )}
            {product.installments > 1 && (
              <p className="text-sm text-gray-600 mt-1">
                ou em até{' '}
                <span className="font-bold">
                  {product.installments}x de R${' '}
                  {installmentValue.toFixed(2).replace('.', ',')}
                </span>{' '}
                sem juros no cartão
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

      {isIphone && (
        <div className="mb-6 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <span className="text-2xl flex-shrink-0" aria-hidden="true">🎁</span>
          <p className="text-sm font-semibold text-blue-900">
            Capinha e película de brinde na compra deste iPhone!
          </p>
        </div>
      )}

      {accessories.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-2.5">Adicionar junto</p>
          <div className="space-y-2">
            {accessories.map(({ product: accessoryProduct, price, available }) => {
              const isChecked = selectedAccessoryIds.has(accessoryProduct.id);
              return (
                <label
                  key={accessoryProduct.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    !available
                      ? 'border-gray-200 opacity-50 cursor-not-allowed'
                      : isChecked
                      ? 'cursor-pointer'
                      : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                  }`}
                  style={isChecked && available ? { borderColor: affiliate.buttonColor || '#0043f7', backgroundColor: `${affiliate.buttonColor || '#0043f7'}0d` } : undefined}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={!available}
                    onChange={() => toggleAccessory(accessoryProduct.id)}
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{ accentColor: affiliate.buttonColor || '#0043f7' }}
                  />
                  {(accessoryProduct.image_url || accessoryProduct.image) && (
                    <img
                      src={accessoryProduct.image_url || accessoryProduct.image}
                      alt={accessoryProduct.name}
                      className="w-10 h-10 object-contain flex-shrink-0"
                    />
                  )}
                  <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">
                    {accessoryProduct.name}
                  </span>
                  <span className="text-sm font-semibold text-gray-700 flex-shrink-0">
                    {available ? `+ R$ ${price.toFixed(2).replace('.', ',')}` : 'Indisponível'}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
            Quantidade
          </label>
          {maxQuantity != null && maxQuantity > 0 && maxQuantity <= 5 && (
            <span className="text-xs font-semibold text-orange-600">
              Apenas {maxQuantity} em estoque
            </span>
          )}
        </div>
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
              onChange={(e) => {
                const parsed = Math.max(1, parseInt(e.target.value) || 1);
                setQuantity(maxQuantity != null ? Math.min(parsed, Math.max(maxQuantity, 1)) : parsed);
              }}
              min="1"
              max={maxQuantity != null ? Math.max(maxQuantity, 1) : undefined}
              className="quantity-input w-16 text-center bg-transparent text-gray-900 font-bold text-lg focus:outline-none h-full border-l border-r border-gray-300"
            />
            <button
              onClick={() => changeQuantity(1)}
              disabled={maxQuantity != null && quantity >= maxQuantity}
              className="px-4 h-full text-lg font-semibold text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
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
            {outOfStock
              ? 'Esgotado'
              : incompleteSelection
              ? (hasSelectableVariants ? 'Escolha as opções' : 'Indisponível')
              : 'Adicionar ao Carrinho'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <button
          onClick={buyNow}
          disabled={!canAddToCart}
          className="w-full bg-brand-dark text-white font-bold py-3 px-6 rounded-lg shadow-md hover:opacity-90 transition-all transform hover:scale-105 action-button disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          Comprar Agora
        </button>
      </div>

      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <i className="fas fa-plane-departure text-sm"></i>
          Retirada em Orlando
        </h3>
        <ul className="space-y-2.5 text-sm text-gray-600">
          <li className="flex items-start gap-2.5">
            <i className="fas fa-calendar-check text-gray-400 mt-0.5"></i>
            <span>Você escolhe a data prevista da sua viagem no checkout.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <i className="fas fa-hand-holding text-gray-400 mt-0.5"></i>
            <span>Retirada pessoal em Orlando — não há entrega no Brasil.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <i className="fas fa-shield-halved text-gray-400 mt-0.5"></i>
            <span>Aparelho original Apple com garantia internacional.</span>
          </li>
        </ul>
      </div>
    </>
  );
}
