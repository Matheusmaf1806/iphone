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

const MAX_INSTALLMENTS_ALLOWED = 21;
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

    // Produtos são marcados com a categoria de duas formas diferentes no banco
    // (category_slug em uns, category com o nome de exibição em outros — mesma
    // inconsistência que /categoria/[slug]/page.js já trata) — por isso tenta
    // primeiro por category_slug e, se não achar nada, cai pra category por nome.
    const PRODUCT_COLUMNS = 'id, slug, name, image_url, price, cost_price, cost_currency, import_tax_percentage, supplier_margin_percentage, is_featured, rating';

    const fetchCategoryRows = async (categorySlug) => {
      const { data: bySlug, error: slugError } = await supabase
        .from('products')
        .select(PRODUCT_COLUMNS)
        .eq('category_slug', categorySlug)
        .eq('is_active', true)
        .limit(200);

      if (slugError) console.error('[combo-suggest] category_slug query error:', categorySlug, slugError);
      if (bySlug && bySlug.length > 0) return bySlug;

      const { data: byName, error: nameError } = await supabase
        .from('products')
        .select(PRODUCT_COLUMNS)
        .ilike('category', CATEGORY_LABELS[categorySlug] || categorySlug)
        .eq('is_active', true)
        .limit(200);

      if (nameError) console.error('[combo-suggest] category name query error:', categorySlug, nameError);
      return byName || [];
    };

    const results = await Promise.all(categories.map(fetchCategoryRows));

    const categoryProducts = {};
    categories.forEach((slug, i) => {
      const rows = results[i] || [];

      const priced = rows
        .map((p) => {
          try {
            const costPrice = parseFloat(p.cost_price) || 0;

            if (costPrice > 0) {
              const costPriceBRL = resolveCostPriceBRL({
                costPrice,
                costCurrency: p.cost_currency,
                importTaxPercentage: p.import_tax_percentage,
                usdBrlRate: config.usdBrlRate,
                defaultImportTaxPercentage: config.defaultImportTaxPercentage,
              });
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

            // Sem custo cadastrado (comum em produto com variantes que ainda não
            // sincronizou, ou cadastro antigo) — mesmo fallback que a home e a
            // página de categoria usam: mostra pelo preço de venda já salvo em
            // vez de excluir o produto inteiro da sugestão.
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
