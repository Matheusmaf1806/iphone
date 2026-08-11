import { NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase/server';
import { getCurrentContext } from '../../../lib/affiliateTracking';
import { calculateAllPrices, resolveCostPriceBRL } from '../../../lib/pricing';
import { buildComboSuggestion } from '../../../lib/comboSuggest';
import { getInstallmentFees, getFeeForInstallments } from '../../../lib/installmentFees';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS = {
  iphone: 'iPhone',
  mac: 'Mac',
  ipad: 'iPad',
  'apple-watch': 'Apple Watch',
  airpods: 'AirPods',
  acessorios: 'Acessórios',
};

const MAX_INSTALLMENTS_ALLOWED = 10;
const MAX_ITEMS_PER_CATEGORY = 25;

export async function POST(request) {
  try {
    const body = await request.json();

    const categories = Array.isArray(body.categories)
      ? [...new Set(body.categories.filter((c) => CATEGORY_LABELS[c]))]
      : [];
    const maxInstallmentValue = parseFloat(body.maxInstallmentValue);
    const maxInstallments = parseInt(body.maxInstallments, 10);

    if (categories.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Selecione ao menos um produto que você quer comprar.' },
        { status: 400 }
      );
    }
    if (!maxInstallmentValue || maxInstallmentValue <= 0) {
      return NextResponse.json(
        { success: false, error: 'Informe quanto você pode pagar por parcela.' },
        { status: 400 }
      );
    }
    if (!maxInstallments || maxInstallments < 1 || maxInstallments > MAX_INSTALLMENTS_ALLOWED) {
      return NextResponse.json(
        { success: false, error: 'Número de parcelas inválido.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Serviço não configurado' }, { status: 500 });
    }

    const { affiliate, config } = await getCurrentContext();
    const affiliateMargin = parseFloat(affiliate?.commission_percentage) || config.defaultAffiliateMargin;

    // A taxa do cartão varia por número de parcelas (installment_fees) — como o
    // cliente já disse quantas parcelas no máximo ele quer, usamos a taxa exata
    // dessa contagem em vez da taxa única (card_fee_percentage) usada no resto do
    // site, onde o número de parcelas ainda não é conhecido nesse ponto do fluxo.
    const installmentFees = await getInstallmentFees();
    const cardFeePercentage = getFeeForInstallments(installmentFees, maxInstallments);

    // Produtos são marcados com a categoria de três formas diferentes no banco,
    // a depender de quando/como foram cadastrados: category_slug preenchido
    // ('apple-watch'), category com o slug direto ('apple-watch') ou category
    // com o nome de exibição ('Apple Watch'). Uma única query com OR cobre os
    // três formatos de uma vez — sequencial ("tenta A, senão B") tem o risco de
    // achar 1 produto num formato e nunca olhar os outros, perdendo produtos que
    // usam o outro formato.
    const PRODUCT_COLUMNS = `
      id, slug, name, image_url, price, cost_price, cost_currency, import_tax_percentage,
      supplier_margin_percentage, is_featured, rating,
      variants:product_variants(cost_price, cost_currency, import_tax_percentage, is_active, stock_quantity)
    `;

    const fetchCategoryRows = async (categorySlug) => {
      const label = CATEGORY_LABELS[categorySlug] || categorySlug;
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_COLUMNS)
        .eq('is_active', true)
        .or(`category_slug.eq."${categorySlug}",category.ilike."${categorySlug}",category.ilike."${label}"`)
        .limit(200);

      if (error) console.error('[combo-suggest] category query error:', categorySlug, error);
      return data || [];
    };

    const results = await Promise.all(categories.map(fetchCategoryRows));

    const categoryProducts = {};
    categories.forEach((slug, i) => {
      const rows = results[i] || [];

      const priced = rows
        .map((p) => {
          try {
            let costPriceBRL = null;

            const directCost = parseFloat(p.cost_price) || 0;
            if (directCost > 0) {
              costPriceBRL = resolveCostPriceBRL({
                costPrice: directCost,
                costCurrency: p.cost_currency,
                importTaxPercentage: p.import_tax_percentage,
                usdBrlRate: config.usdBrlRate,
                defaultImportTaxPercentage: config.defaultImportTaxPercentage,
              });
            } else if (Array.isArray(p.variants) && p.variants.length > 0) {
              // products.cost_price ficou 0 (nunca sincronizou depois de criar as
              // variantes) — calcula direto da variante mais barata com estoque,
              // mesma fórmula que syncProductFromVariants() usa pra gravar isso
              // no produto. Sem isso, produto com variante fica invisível pro
              // assistente mesmo tendo custo e estoque cadastrados nos SKUs.
              // Não depende do flag has_variants do produto — esse flag pode estar
              // desatualizado pelo mesmo motivo (mesmo problema documentado em
              // lib/products.js: a fonte de verdade é a linha existir em
              // product_variants, não o checkbox salvo no formulário do produto).
              const eligible = p.variants.filter(
                (v) => v.is_active !== false && parseFloat(v.cost_price) > 0 && (v.stock_quantity == null || v.stock_quantity > 0)
              );
              if (eligible.length > 0) {
                const costsInBRL = eligible.map((v) => resolveCostPriceBRL({
                  costPrice: parseFloat(v.cost_price),
                  costCurrency: v.cost_currency || 'BRL',
                  importTaxPercentage: v.import_tax_percentage != null ? parseFloat(v.import_tax_percentage) : null,
                  usdBrlRate: config.usdBrlRate,
                  defaultImportTaxPercentage: config.defaultImportTaxPercentage,
                }));
                costPriceBRL = Math.min(...costsInBRL);
              }
            }

            if (costPriceBRL != null && costPriceBRL > 0) {
              const prices = calculateAllPrices({
                costPrice: costPriceBRL,
                supplierMarginPercentage: parseFloat(p.supplier_margin_percentage) || 10,
                affiliateMarginPercentage: affiliateMargin,
                cardFeePercentage,
              });

              return {
                id: p.id,
                slug: p.slug,
                name: p.name,
                image_url: p.image_url,
                isFeatured: !!p.is_featured,
                rating: parseFloat(p.rating) || 0,
                pixPrice: prices.pixPrice,
                cardPrice: prices.finalPrice,
              };
            }

            // Último recurso: sem custo em lugar nenhum (produto nem variante) —
            // usa o preço de venda já salvo em vez de excluir o produto inteiro,
            // mesmo fallback que a home e a página de categoria usam.
            const fallbackPrice = parseFloat(p.price) || 0;
            if (fallbackPrice <= 0) return null;

            return {
              id: p.id,
              slug: p.slug,
              name: p.name,
              image_url: p.image_url,
              isFeatured: !!p.is_featured,
              rating: parseFloat(p.rating) || 0,
              pixPrice: fallbackPrice,
              cardPrice: fallbackPrice,
            };
          } catch (err) {
            console.error('[combo-suggest] price calc error for product:', p.id, err);
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => a.cardPrice - b.cardPrice)
        .slice(0, MAX_ITEMS_PER_CATEGORY);

      categoryProducts[slug] = priced;
    });

    const combo = buildComboSuggestion({ categoryProducts, maxInstallmentValue, maxInstallments });

    if (!combo.success) {
      const error = combo.reason === 'no_products'
        ? 'Não encontramos produtos disponíveis nessas categorias no momento.'
        : 'Nem o item mais em conta cabe nesse orçamento — tenta aumentar o valor da parcela ou o número de parcelas.';

      return NextResponse.json({
        success: false,
        reason: combo.reason,
        error,
        cheapestOption: combo.cheapestOption
          ? { ...combo.cheapestOption, categoryLabel: CATEGORY_LABELS[combo.cheapestOption.slug] }
          : null,
      });
    }

    return NextResponse.json({
      success: true,
      combo: {
        totalCard: combo.totalCard,
        totalPix: combo.totalPix,
        installmentsUsed: combo.installmentsUsed,
        installmentValue: combo.installmentValue,
        cardFeePercentage,
        budget: combo.budget,
        leftover: combo.leftover,
        items: combo.items.map((item) => ({
          category: item.category,
          categoryLabel: CATEGORY_LABELS[item.category] || item.category,
          ...item.product,
        })),
        droppedForBudget: combo.droppedForBudget.map((slug) => ({
          category: slug,
          categoryLabel: CATEGORY_LABELS[slug] || slug,
        })),
        unavailableCategories: combo.unavailableCategories.map((slug) => ({
          category: slug,
          categoryLabel: CATEGORY_LABELS[slug] || slug,
        })),
      },
    });
  } catch (error) {
    console.error('[combo-suggest] error:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
