/**
 * Motor de sugestão de combo do assistente de compras da home.
 *
 * Recebe, por categoria escolhida pelo cliente, a lista de produtos já com preço
 * calculado (ordenada do mais barato pro mais caro) e devolve o melhor combo — um
 * produto por categoria — que cabe no orçamento (parcela máxima x nº de parcelas).
 *
 * Estratégia gulosa em duas fases:
 * 1. Baseline: inclui a opção mais barata de cada categoria, começando pelas
 *    categorias mais baratas — se o orçamento for apertado, é o que garante incluir
 *    o máximo de categorias possível em vez de estourar tentando encaixar todas.
 * 2. Upgrade: com o que sobrou de orçamento, sobe o produto de uma categoria por vez
 *    (sempre o maior salto de preço que ainda cabe), até não sobrar mais espaço —
 *    assim o combo usa o orçamento do cliente em vez de devolver sempre o mais barato.
 */
export function buildComboSuggestion({ categoryProducts, maxInstallmentValue, maxInstallments }) {
  const budget = maxInstallmentValue * maxInstallments;

  const availableCategories = Object.keys(categoryProducts).filter(
    (slug) => (categoryProducts[slug] || []).length > 0
  );
  const unavailableCategories = Object.keys(categoryProducts).filter(
    (slug) => (categoryProducts[slug] || []).length === 0
  );

  if (availableCategories.length === 0) {
    return { success: false, reason: 'no_products', unavailableCategories };
  }

  const sortedByBaseline = [...availableCategories].sort(
    (a, b) => categoryProducts[a][0].cardPrice - categoryProducts[b][0].cardPrice
  );

  const included = [];
  let total = 0;
  for (const slug of sortedByBaseline) {
    const cheapest = categoryProducts[slug][0];
    if (total + cheapest.cardPrice <= budget) {
      included.push(slug);
      total += cheapest.cardPrice;
    }
  }

  if (included.length === 0) {
    return {
      success: false,
      reason: 'budget_too_low',
      cheapestOption: categoryProducts[sortedByBaseline[0]][0],
      unavailableCategories,
    };
  }

  const droppedForBudget = availableCategories.filter((slug) => !included.includes(slug));

  // índice, dentro da lista ordenada de cada categoria incluída, do produto escolhido
  const selectionIndex = {};
  included.forEach((slug) => { selectionIndex[slug] = 0; });

  let remaining = budget - total;
  let keepUpgrading = true;

  while (keepUpgrading) {
    keepUpgrading = false;
    let bestSlug = null;
    let bestJump = -1;
    let bestNextIndex = null;

    for (const slug of included) {
      const list = categoryProducts[slug];
      const nextIndex = selectionIndex[slug] + 1;
      if (nextIndex >= list.length) continue;

      const jump = list[nextIndex].cardPrice - list[selectionIndex[slug]].cardPrice;
      if (jump <= remaining && jump > bestJump) {
        bestJump = jump;
        bestSlug = slug;
        bestNextIndex = nextIndex;
      }
    }

    if (bestSlug) {
      selectionIndex[bestSlug] = bestNextIndex;
      remaining -= bestJump;
      keepUpgrading = true;
    }
  }

  const items = included.map((slug) => ({
    category: slug,
    product: categoryProducts[slug][selectionIndex[slug]],
  }));

  const totalCard = items.reduce((sum, item) => sum + item.product.cardPrice, 0);
  const totalPix = items.reduce((sum, item) => sum + item.product.pixPrice, 0);
  const installmentsUsed = Math.min(maxInstallments, Math.max(1, Math.ceil(totalCard / maxInstallmentValue)));
  const installmentValue = totalCard / installmentsUsed;

  return {
    success: true,
    items,
    totalCard: round2(totalCard),
    totalPix: round2(totalPix),
    installmentsUsed,
    installmentValue: round2(installmentValue),
    budget: round2(budget),
    leftover: round2(remaining),
    droppedForBudget,
    unavailableCategories,
  };
}

function round2(value) {
  return parseFloat(value.toFixed(2));
}
