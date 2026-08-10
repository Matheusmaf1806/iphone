import { calculateAllPrices, resolveCostPriceBRL } from './pricing';

// Faixa segura pra affiliateMarginPercentage vindo do cliente (só usada quando
// allowClientMarkup é true e a sessão foi validada pelo chamador): abaixo de 0
// vende abaixo do custo líquido, e >= 100 quebra pixPrice = netPrice / (1 - m/100)
// (divide por zero ou fica negativo).
const MIN_CLIENT_MARKUP = 0;
const MAX_CLIENT_MARKUP = 90;

/**
 * Busca produtos/variantes autoritativos no banco e calcula o preço de cada item do
 * carrinho — nunca confia em preço/custo vindo do cliente, só productId/variantId/
 * quantity (e customMarkup, só quando allowClientMarkup=true). Usado tanto na criação
 * do pedido (app/api/orders/create) quanto na criação da cobrança de pagamento
 * (app/api/payments/paypal/create-order), pra garantir que o valor efetivamente
 * cobrado do cliente seja sempre exatamente o mesmo valor que seria gravado no
 * pedido — nenhum dos dois lados confia num "amount" calculado no navegador.
 *
 * @param {number} [cardFeePercentageOverride] - taxa de cartão a usar em vez de
 *   config.cardFeePercentage (ex: taxa específica de installment_fees pro número de
 *   parcelas escolhido no checkout) — a taxa varia por nº de parcelas nesse fluxo,
 *   a taxa fixa de platform_config é usada só como fallback.
 * @param {boolean} [allowClientMarkup] - só true quando o CHAMADOR já validou
 *   server-side (sessão de agente autenticada, vinculada ao affiliateId do pedido)
 *   que o item.customMarkup vindo no body é legítimo. Com false (padrão), todo
 *   customMarkup do cliente é ignorado — sem isso, qualquer request adulterado
 *   conseguiria definir a própria margem (inclusive negativa, vendendo abaixo do
 *   custo) sem estar autenticado como afiliado nenhum.
 * @returns {Object} `{ error }` se algum item for inválido, ou
 *   `{ productMap, variantMap, itemsWithPrices, subtotal, totalSupplierAmount,
 *   totalAffiliateAmount }` com o detalhamento por item e os totais agregados
 *   (usados, por exemplo, pra limitar o desconto de cupom à margem real do pedido).
 */
export async function priceCartItems({ supabase, items, affiliate, config, isPix = false, cardFeePercentageOverride, allowClientMarkup = false }) {
  const productIds = [...new Set(items.map(item => item.productId))];
  const variantIds = [...new Set(items.filter(item => item.variantId).map(item => item.variantId))];

  const { data: products } = await supabase
    .from('products')
    .select('id, name, has_variants, cost_price, cost_currency, import_tax_percentage, supplier_margin_percentage, stock_type, stock_quantity')
    .in('id', productIds);
  const productMap = Object.fromEntries((products || []).map(p => [p.id, p]));

  let variantMap = {};
  if (variantIds.length > 0) {
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, product_id, sku, attributes, cost_price, cost_currency, import_tax_percentage, supplier_margin_percentage, stock_quantity, is_active')
      .in('id', variantIds);
    variantMap = Object.fromEntries((variants || []).map(v => [v.id, v]));
  }

  for (const item of items) {
    // Quantidade tem que ser um inteiro positivo — negativo/zero conseguiria
    // reduzir o total cobrado e, no decremento de estoque, inverter o movimento
    // "out" num aumento de estoque em vez de baixa.
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { error: 'Quantidade inválida' };
    }

    const product = productMap[item.productId];
    if (!product) {
      return { error: 'Produto não encontrado' };
    }

    if (item.variantId) {
      const variant = variantMap[item.variantId];
      if (!variant || variant.is_active === false || variant.product_id !== item.productId) {
        return { error: `Variante indisponível para ${product.name}` };
      }
      if (variant.cost_price == null) {
        return { error: `${product.name} está sem preço configurado` };
      }
      if (variant.stock_quantity < item.quantity) {
        const attrs = Object.entries(variant.attributes || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
        return { error: `Estoque insuficiente para ${product.name}${attrs ? ' — ' + attrs : ''} (disponível: ${Math.max(variant.stock_quantity, 0)})` };
      }
    } else {
      // Produto com variação nunca pode ser precificado/cobrado "às cegas" — sem
      // isso, um request adulterado conseguiria pagar usando o preço agregado do
      // produto, sem nenhum SKU específico associado.
      if (product.has_variants) {
        return { error: `Selecione uma variação (cor, armazenamento, etc.) para ${product.name}` };
      }
      if (product.cost_price == null) {
        return { error: `${product.name} está sem preço configurado` };
      }
      if (product.stock_type === 'limited' && product.stock_quantity !== -1 && product.stock_quantity < item.quantity) {
        return { error: `Estoque insuficiente para ${product.name} (disponível: ${Math.max(product.stock_quantity, 0)})` };
      }
    }
  }

  let subtotal = 0;
  const itemsWithPrices = items.map(item => {
    const product = productMap[item.productId];
    const variant = item.variantId ? variantMap[item.variantId] : null;

    const rawCostPrice = parseFloat(variant ? variant.cost_price : product.cost_price);
    const costCurrency = (variant ? variant.cost_currency : product.cost_currency) || 'BRL';
    const importTaxPercentage = variant?.import_tax_percentage ?? product.import_tax_percentage;
    const supplierMarginPercentage = parseFloat(variant?.supplier_margin_percentage ?? product.supplier_margin_percentage);

    const costPrice = resolveCostPriceBRL({
      costPrice: rawCostPrice,
      costCurrency,
      importTaxPercentage,
      usdBrlRate: config.usdBrlRate,
      defaultImportTaxPercentage: config.defaultImportTaxPercentage,
    });

    const defaultMargin = affiliate?.commission_rate || config.defaultAffiliateMargin;
    const hasClientMarkup = item.customMarkup !== null && item.customMarkup !== undefined && item.customMarkup !== '';
    const affiliateMargin = (allowClientMarkup && hasClientMarkup)
      ? Math.min(Math.max(parseFloat(item.customMarkup) || 0, MIN_CLIENT_MARKUP), MAX_CLIENT_MARKUP)
      : defaultMargin;

    const prices = calculateAllPrices({
      costPrice,
      supplierMarginPercentage,
      affiliateMarginPercentage: affiliateMargin,
      cardFeePercentage: cardFeePercentageOverride ?? config.cardFeePercentage,
    });

    const unitPrice = isPix ? prices.pixPrice : prices.finalPrice;
    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;

    return {
      item,
      product,
      variant,
      prices,
      costPrice,
      costCurrency,
      supplierMarginPercentage,
      affiliateMargin,
      unitPrice,
      itemTotal,
    };
  });

  const totalSupplierAmount = itemsWithPrices.reduce(
    (sum, r) => sum + (r.prices.netPrice - r.prices.costPrice) * r.item.quantity, 0
  );
  const totalAffiliateAmount = itemsWithPrices.reduce(
    (sum, r) => sum + (r.prices.pixPrice - r.prices.netPrice) * r.item.quantity, 0
  );

  return {
    productMap,
    variantMap,
    itemsWithPrices,
    subtotal: parseFloat(subtotal.toFixed(2)),
    totalSupplierAmount: parseFloat(totalSupplierAmount.toFixed(2)),
    totalAffiliateAmount: parseFloat(totalAffiliateAmount.toFixed(2)),
  };
}
