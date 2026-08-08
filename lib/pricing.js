/**
 * Biblioteca de cálculos de preços e margens
 *
 * Fluxo de cálculo:
 * 1. Custo base (cost_price)
 * 2. + Margem Supplier → NET
 * 3. + Margem Afiliado → PRICE_PIX
 * 4. + Taxa Cartão → PRICE_FINAL
 */

/**
 * Calcula o preço NET (após margem do supplier)
 * Formula: NET = cost / (1 - supplier_margin%)
 *
 * @param {number} costPrice - Preço de custo
 * @param {number} supplierMarginPercentage - Margem do supplier em %
 * @returns {number} Preço NET
 */
export function calculateNetPrice(costPrice, supplierMarginPercentage) {
  const marginDecimal = supplierMarginPercentage / 100;
  return costPrice / (1 - marginDecimal);
}

/**
 * Calcula o preço PIX (após margem do afiliado)
 * Formula: PRICE_PIX = net / (1 - affiliate_margin%)
 *
 * @param {number} netPrice - Preço NET
 * @param {number} affiliateMarginPercentage - Margem do afiliado em %
 * @returns {number} Preço PIX
 */
export function calculatePixPrice(netPrice, affiliateMarginPercentage) {
  const marginDecimal = affiliateMarginPercentage / 100;
  return netPrice / (1 - marginDecimal);
}

/**
 * Calcula o preço final com cartão (após taxa do cartão)
 * Formula: PRICE_FINAL = pix / (1 - card_fee%)
 *
 * @param {number} pixPrice - Preço PIX
 * @param {number} cardFeePercentage - Taxa do cartão em %
 * @returns {number} Preço final
 */
export function calculateFinalPrice(pixPrice, cardFeePercentage) {
  const feeDecimal = cardFeePercentage / 100;
  return pixPrice / (1 - feeDecimal);
}

/**
 * Calcula todos os preços de uma vez
 *
 * @param {Object} params
 * @param {number} params.costPrice - Preço de custo
 * @param {number} params.supplierMarginPercentage - Margem supplier em %
 * @param {number} params.affiliateMarginPercentage - Margem afiliado em %
 * @param {number} params.cardFeePercentage - Taxa cartão em %
 * @returns {Object} Objeto com todos os preços calculados
 */
export function calculateAllPrices({
  costPrice,
  supplierMarginPercentage,
  affiliateMarginPercentage,
  cardFeePercentage
}) {
  const netPrice = calculateNetPrice(costPrice, supplierMarginPercentage);
  const pixPrice = calculatePixPrice(netPrice, affiliateMarginPercentage);
  const finalPrice = calculateFinalPrice(pixPrice, cardFeePercentage);

  return {
    costPrice: parseFloat(costPrice.toFixed(2)),
    netPrice: parseFloat(netPrice.toFixed(2)),
    pixPrice: parseFloat(pixPrice.toFixed(2)),
    finalPrice: parseFloat(finalPrice.toFixed(2)),
  };
}

/**
 * Calcula o breakdown de valores (quanto cada um recebe)
 *
 * @param {Object} params
 * @param {number} params.costPrice - Preço de custo
 * @param {number} params.netPrice - Preço NET
 * @param {number} params.pixPrice - Preço PIX
 * @param {number} params.finalPrice - Preço final
 * @param {number} params.quantity - Quantidade
 * @returns {Object} Breakdown de valores
 */
export function calculatePriceBreakdown({
  costPrice,
  netPrice,
  pixPrice,
  finalPrice,
  quantity = 1
}) {
  // Valores por unidade
  const supplierAmountUnit = netPrice - costPrice;
  const affiliateAmountUnit = pixPrice - netPrice;
  const cardFeeAmountUnit = finalPrice - pixPrice;

  // Valores totais
  const costTotal = costPrice * quantity;
  const supplierAmount = supplierAmountUnit * quantity;
  const affiliateAmount = affiliateAmountUnit * quantity;
  const cardFeeAmount = cardFeeAmountUnit * quantity;
  const total = finalPrice * quantity;

  return {
    // Por unidade
    unit: {
      cost: parseFloat(costPrice.toFixed(2)),
      supplierMargin: parseFloat(supplierAmountUnit.toFixed(2)),
      affiliateMargin: parseFloat(affiliateAmountUnit.toFixed(2)),
      cardFee: parseFloat(cardFeeAmountUnit.toFixed(2)),
      total: parseFloat(finalPrice.toFixed(2)),
    },
    // Total
    total: {
      cost: parseFloat(costTotal.toFixed(2)),
      supplierMargin: parseFloat(supplierAmount.toFixed(2)),
      affiliateMargin: parseFloat(affiliateAmount.toFixed(2)),
      cardFee: parseFloat(cardFeeAmount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
    },
    quantity,
  };
}

/**
 * Calcula preços para múltiplos produtos
 *
 * @param {Array} products - Array de produtos com quantidade
 * @param {number} cardFeePercentage - Taxa do cartão
 * @returns {Object} Resumo com breakdown de todos os produtos
 */
export function calculateCartPrices(products, cardFeePercentage) {
  let totalCost = 0;
  let totalSupplierMargin = 0;
  let totalAffiliateMargin = 0;
  let totalCardFee = 0;
  let totalFinal = 0;

  const itemsBreakdown = products.map(product => {
    const prices = calculateAllPrices({
      costPrice: product.cost_price,
      supplierMarginPercentage: product.supplier_margin_percentage,
      affiliateMarginPercentage: product.affiliate_margin_percentage,
      cardFeePercentage,
    });

    const breakdown = calculatePriceBreakdown({
      costPrice: prices.costPrice,
      netPrice: prices.netPrice,
      pixPrice: prices.pixPrice,
      finalPrice: prices.finalPrice,
      quantity: product.quantity,
    });

    totalCost += breakdown.total.cost;
    totalSupplierMargin += breakdown.total.supplierMargin;
    totalAffiliateMargin += breakdown.total.affiliateMargin;
    totalCardFee += breakdown.total.cardFee;
    totalFinal += breakdown.total.total;

    return {
      productId: product.id,
      productName: product.name,
      quantity: product.quantity,
      prices,
      breakdown,
    };
  });

  return {
    items: itemsBreakdown,
    summary: {
      totalCost: parseFloat(totalCost.toFixed(2)),
      totalSupplierMargin: parseFloat(totalSupplierMargin.toFixed(2)),
      totalAffiliateMargin: parseFloat(totalAffiliateMargin.toFixed(2)),
      totalCardFee: parseFloat(totalCardFee.toFixed(2)),
      total: parseFloat(totalFinal.toFixed(2)),
    },
  };
}

/**
 * Formata valores em reais
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Calcula percentual sobre valor
 */
export function calculatePercentage(value, total) {
  if (total === 0) return 0;
  return parseFloat(((value / total) * 100).toFixed(2));
}

/**
 * Exemplo de uso e teste
 */
export function testPricingCalculations() {
  console.log('\n=== TESTE DE CÁLCULO DE PREÇOS ===\n');

  const testProduct = {
    name: 'Vela 7 Ervas',
    cost_price: 35.00,
    supplier_margin_percentage: 10,
    affiliate_margin_percentage: 10,
  };

  const cardFeePercentage = 9.68;

  console.log('Produto:', testProduct.name);
  console.log('Custo:', formatCurrency(testProduct.cost_price));
  console.log('Margem Supplier:', testProduct.supplier_margin_percentage + '%');
  console.log('Margem Afiliado:', testProduct.affiliate_margin_percentage + '%');
  console.log('Taxa Cartão:', cardFeePercentage + '%');
  console.log('\n--- CÁLCULOS ---\n');

  const prices = calculateAllPrices({
    costPrice: testProduct.cost_price,
    supplierMarginPercentage: testProduct.supplier_margin_percentage,
    affiliateMarginPercentage: testProduct.affiliate_margin_percentage,
    cardFeePercentage,
  });

  console.log('NET Price:', formatCurrency(prices.netPrice));
  console.log('PIX Price:', formatCurrency(prices.pixPrice));
  console.log('Final Price (Cartão):', formatCurrency(prices.finalPrice));

  console.log('\n--- BREAKDOWN (1 unidade) ---\n');

  const breakdown = calculatePriceBreakdown({
    costPrice: prices.costPrice,
    netPrice: prices.netPrice,
    pixPrice: prices.pixPrice,
    finalPrice: prices.finalPrice,
    quantity: 1,
  });

  console.log('Custo Produto:', formatCurrency(breakdown.unit.cost));
  console.log('Margem Supplier:', formatCurrency(breakdown.unit.supplierMargin),
    `(${calculatePercentage(breakdown.unit.supplierMargin, breakdown.unit.total)}%)`);
  console.log('Margem Afiliado:', formatCurrency(breakdown.unit.affiliateMargin),
    `(${calculatePercentage(breakdown.unit.affiliateMargin, breakdown.unit.total)}%)`);
  console.log('Taxa Cartão:', formatCurrency(breakdown.unit.cardFee),
    `(${calculatePercentage(breakdown.unit.cardFee, breakdown.unit.total)}%)`);
  console.log('Total Cliente:', formatCurrency(breakdown.unit.total));

  console.log('\n--- BREAKDOWN (2 unidades) ---\n');

  const breakdown2 = calculatePriceBreakdown({
    costPrice: prices.costPrice,
    netPrice: prices.netPrice,
    pixPrice: prices.pixPrice,
    finalPrice: prices.finalPrice,
    quantity: 2,
  });

  console.log('Custo Produto:', formatCurrency(breakdown2.total.cost));
  console.log('Margem Supplier:', formatCurrency(breakdown2.total.supplierMargin));
  console.log('Margem Afiliado:', formatCurrency(breakdown2.total.affiliateMargin));
  console.log('Taxa Cartão:', formatCurrency(breakdown2.total.cardFee));
  console.log('Total Cliente:', formatCurrency(breakdown2.total.total));

  console.log('\n=== FIM DO TESTE ===\n');
}

// Descomentar para testar
// testPricingCalculations();
