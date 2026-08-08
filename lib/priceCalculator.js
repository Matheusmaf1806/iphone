/**
 * Calculadora de preços considerando margens do fornecedor e afiliado
 *
 * Estrutura de cálculo:
 * 1. Custo Base (cost_price)
 * 2. + Margem Fornecedor (supplier_margin_percentage)
 * 3. = Preço Net (para o fornecedor)
 * 4. + Margem Afiliado (commission_rate ou custom_commission_rate)
 * 5. = Preço PIX
 * 6. + Taxa Cartão (se aplicável)
 * 7. = Preço Final
 */

/**
 * Calcula o preço de um produto para um afiliado específico
 *
 * @param {Object} params
 * @param {number} params.costPrice - Custo base do produto
 * @param {number} params.supplierMargin - Margem do fornecedor (%)
 * @param {number} params.affiliateMargin - Margem do afiliado (%)
 * @param {number} params.cardFee - Taxa do cartão (%) - opcional
 * @returns {Object} Breakdown completo dos preços
 */
export function calculateProductPrice({
  costPrice,
  supplierMargin = 10.0,
  affiliateMargin = 10.0,
  cardFee = 0,
}) {
  // Converter percentuais para decimais
  const supplierRate = supplierMargin / 100;
  const affiliateRate = affiliateMargin / 100;
  const cardRate = cardFee / 100;

  // 1. Preço Net (depois da margem do fornecedor)
  // Formula: costPrice / (1 - supplierRate)
  const netPrice = costPrice / (1 - supplierRate);

  // 2. Margem do fornecedor (valor absoluto)
  const supplierAmount = netPrice - costPrice;

  // 3. Preço PIX (depois da margem do afiliado)
  // Formula: netPrice / (1 - affiliateRate)
  const pixPrice = netPrice / (1 - affiliateRate);

  // 4. Margem do afiliado (valor absoluto)
  const affiliateAmount = pixPrice - netPrice;

  // 5. Preço final com cartão (se aplicável)
  const finalPrice = cardRate > 0 ? pixPrice / (1 - cardRate) : pixPrice;

  // 6. Taxa do cartão (valor absoluto)
  const cardFeeAmount = finalPrice - pixPrice;

  return {
    costPrice: parseFloat(costPrice.toFixed(2)),
    supplierMarginPercentage: supplierMargin,
    affiliateMarginPercentage: affiliateMargin,
    cardFeePercentage: cardFee,

    netPrice: parseFloat(netPrice.toFixed(2)),
    pixPrice: parseFloat(pixPrice.toFixed(2)),
    finalPrice: parseFloat(finalPrice.toFixed(2)),

    supplierAmount: parseFloat(supplierAmount.toFixed(2)),
    affiliateAmount: parseFloat(affiliateAmount.toFixed(2)),
    cardFeeAmount: parseFloat(cardFeeAmount.toFixed(2)),
  };
}

/**
 * Calcula o preço de venda necessário baseado no custo e margens desejadas
 *
 * @param {number} costPrice - Custo base
 * @param {number} supplierMargin - Margem do fornecedor (%)
 * @param {number} affiliateMargin - Margem do afiliado (%)
 * @returns {number} Preço de venda recomendado
 */
export function calculateRecommendedPrice(costPrice, supplierMargin = 10.0, affiliateMargin = 10.0) {
  const calculation = calculateProductPrice({
    costPrice,
    supplierMargin,
    affiliateMargin,
    cardFee: 0, // Preço PIX
  });

  return calculation.pixPrice;
}

/**
 * Calcula a margem efetiva dada um custo e preço de venda
 *
 * @param {number} costPrice - Custo base
 * @param {number} sellingPrice - Preço de venda
 * @returns {number} Margem em percentual
 */
export function calculateEffectiveMargin(costPrice, sellingPrice) {
  if (costPrice <= 0 || sellingPrice <= 0) return 0;
  return ((sellingPrice - costPrice) / sellingPrice) * 100;
}

/**
 * Valida se uma margem é viável (não negativa)
 *
 * @param {number} costPrice - Custo base
 * @param {number} sellingPrice - Preço de venda
 * @returns {boolean} True se a margem é viável
 */
export function isMarginViable(costPrice, sellingPrice) {
  return sellingPrice > costPrice;
}

/**
 * Formata um valor monetário para exibição
 *
 * @param {number} value - Valor a formatar
 * @param {string} currency - Símbolo da moeda (padrão: R$)
 * @returns {string} Valor formatado
 */
export function formatCurrency(value, currency = 'R$') {
  return `${currency} ${value.toFixed(2).replace('.', ',')}`;
}

/**
 * Calcula parcelamento sem juros
 *
 * @param {number} totalPrice - Preço total
 * @param {number} maxInstallments - Número máximo de parcelas
 * @returns {Object} Informações do parcelamento
 */
export function calculateInstallments(totalPrice, maxInstallments = 12) {
  const installmentValue = totalPrice / maxInstallments;

  return {
    maxInstallments,
    installmentValue: parseFloat(installmentValue.toFixed(2)),
    totalPrice: parseFloat(totalPrice.toFixed(2)),
  };
}
