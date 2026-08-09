import { calculateAllPrices, resolveCostPriceBRL } from './pricing';

/**
 * Busca produtos/variantes autoritativos no banco e calcula o preço de cada item do
 * carrinho — nunca confia em preço/custo vindo do cliente, só productId/variantId/
 * quantity/customMarkup. Usado tanto na criação do pedido (app/api/orders/create)
 * quanto na criação da cobrança de pagamento (app/api/payments/paypal/create-order),
 * pra garantir que o valor efetivamente cobrado do cliente seja sempre exatamente o
 * mesmo valor que seria gravado no pedido — nenhum dos dois lados confia num "amount"
 * calculado no navegador.
 *
 * @returns {Object} `{ error }` se algum item for inválido, ou
 *   `{ productMap, variantMap, itemsWithPrices, subtotal }` com o detalhamento por item.
 */
export async function priceCartItems({ supabase, items, affiliate, config, isPix = false }) {
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

    const affiliateMargin = (item.customMarkup !== null && item.customMarkup !== undefined)
      ? item.customMarkup
      : (affiliate?.commission_rate || config.defaultAffiliateMargin);

    const prices = calculateAllPrices({
      costPrice,
      supplierMarginPercentage,
      affiliateMarginPercentage: affiliateMargin,
      cardFeePercentage: config.cardFeePercentage,
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

  return {
    productMap,
    variantMap,
    itemsWithPrices,
    subtotal: parseFloat(subtotal.toFixed(2)),
  };
}
