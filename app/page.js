import Header from '../components/Header';
import Footer from '../components/Footer';
import HeroBanner from '../components/HeroBanner';
import ShoppingAssistant from '../components/ShoppingAssistant';
import FeaturesBar from '../components/FeaturesBar';
import CategoriesSection from '../components/CategoriesSection';
import AppleUniverseCarousel from '../components/AppleUniverseCarousel';
import MacBookLineupCarousel from '../components/MacBookLineupCarousel';
import FeaturedProducts from '../components/FeaturedProducts';
import PromoBanner from '../components/PromoBanner';
import TestimonialsSection from '../components/TestimonialsSection';
import { getCurrentContext } from '../lib/affiliateTracking';
import { createServerClient } from '../lib/supabase/server';
import { calculateAllPrices, resolveCostPriceBRL } from '../lib/pricing';
import { computeVariantRollup } from '../lib/products';

const CAROUSEL_CATEGORIES = ['iphone', 'mac', 'apple-watch', 'ipad', 'airpods', 'acessorios'];
const MACBOOK_SLUGS = ['macbook-neo', 'macbook-air-m5', 'macbook-pro-m5'];

const CATEGORY_LABELS = {
  iphone: 'iPhone',
  mac: 'Mac',
  'apple-watch': 'Apple Watch',
  ipad: 'iPad',
  airpods: 'AirPods',
  acessorios: 'Acessórios',
};

// Calcula preço (PIX/cartão) de uma lista de produtos crus vindos do banco — SKU mais
// barato quando o produto tem variação, senão o custo direto do produto. Reaproveitada
// pelas 3 seções de destaque (iPhone / Apple Watch / AirPods) pra não triplicar a
// mesma lógica de precificação.
function priceProducts(products, affiliate, config) {
  return (products || []).map(product => {
    try {
      const rawCostPrice = parseFloat(product.cost_price) || 0;
      const supplierMargin = parseFloat(product.supplier_margin_percentage) || 10;
      const affiliateMargin = parseFloat(affiliate?.commission_percentage) || config.defaultAffiliateMargin;

      // Produto com variação: custo/preço vêm do SKU mais barato (já sai resolvido
      // pra BRL) — não confia em products.cost_price sozinho, que só fica certo
      // depois que alguém salva em "Gerenciar Variantes".
      const hasVariants = !!(product.has_variants || (product.variants || []).some(v => v.is_active !== false));
      const rollup = hasVariants ? computeVariantRollup(product.variants, product.supplier_margin_percentage, config) : null;
      const costPriceBRL = rollup?.costPrice != null
        ? rollup.costPrice
        : (rawCostPrice > 0 ? resolveCostPriceBRL({
            costPrice: rawCostPrice,
            costCurrency: product.cost_currency,
            importTaxPercentage: product.import_tax_percentage,
            usdBrlRate: config.usdBrlRate,
            defaultImportTaxPercentage: config.defaultImportTaxPercentage,
          }) : null);

      if (costPriceBRL != null) {
        const prices = calculateAllPrices({
          costPrice: costPriceBRL,
          supplierMarginPercentage: supplierMargin,
          affiliateMarginPercentage: affiliateMargin,
          cardFeePercentage: config.cardFeePercentage,
        });

        return {
          ...product,
          pixPrice: prices.pixPrice,
          cardPrice: prices.finalPrice,
          displayPrice: prices.pixPrice,
        };
      }
    } catch (err) {
      console.error('[Home] Price calc error for product:', product.id, err);
    }

    // Fallback: use stored price
    const fallbackPrice = parseFloat(product.price) || 0;
    return {
      ...product,
      pixPrice: fallbackPrice,
      cardPrice: fallbackPrice,
      displayPrice: fallbackPrice,
    };
  });
}

// Produtos são marcados com a categoria de três formas diferentes no banco, a depender
// de quando/como foram cadastrados (mesmo padrão já usado em combo-suggest e na página
// de categoria) — uma única query com OR cobre os três formatos de uma vez.
async function fetchCategoryProducts(supabase, categorySlug, limit) {
  const label = CATEGORY_LABELS[categorySlug] || categorySlug;
  const { data, error } = await supabase
    .from('products')
    .select('*, variants:product_variants(*)')
    .eq('is_active', true)
    .or(`category_slug.eq."${categorySlug}",category.ilike."${categorySlug}",category.ilike."${label}"`)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Home] Error fetching category products:', categorySlug, error);
    return [];
  }
  return data || [];
}

export default async function Home() {
  // Detectar afiliado pelo domínio
  let affiliate = null;
  let config = { cardFeePercentage: 9.68, defaultAffiliateMargin: 10 };

  try {
    const context = await getCurrentContext();
    affiliate = context.affiliate;
    config = context.config;
  } catch (err) {
    console.error('[Home] Error getting context:', err);
  }

  const supabase = createServerClient();

  let iphoneProducts = [];
  let extraProducts = [];
  const startingPrices = {};
  const macbookPrices = {};

  if (supabase) {
    try {
      // Busca até 100 produtos ativos por categoria — dá pra achar o "a partir de"
      // (mínimo real, calculado a partir do SKU/produto mais barato) com folga acima
      // do catálogo atual, em vez de confiar em products.price (frequentemente
      // desatualizado em produto com variação) ou olhar só 1 produto "no chute".
      const categoryRowsBySlug = Object.fromEntries(
        await Promise.all(
          CAROUSEL_CATEGORIES.map(async (slug) => [slug, await fetchCategoryProducts(supabase, slug, 100)])
        )
      );

      const pricedBySlug = Object.fromEntries(
        CAROUSEL_CATEGORIES.map((slug) => [slug, priceProducts(categoryRowsBySlug[slug], affiliate, config)])
      );

      // Carrossel de destaque usa iPhone (sozinho, seção própria) + iPad/AirPods/
      // Apple Watch intercalados numa segunda seção única — mostra os mais recentes/
      // em destaque primeiro (mesma ordem já vinda da query), sem precisar do
      // catálogo inteiro na tela.
      iphoneProducts = pricedBySlug.iphone.slice(0, 12);
      const ipadProducts = pricedBySlug.ipad.slice(0, 8);
      const airpodsProducts = pricedBySlug.airpods.slice(0, 8);
      const watchProducts = pricedBySlug['apple-watch'].slice(0, 8);

      // Intercala as 3 listas (1 de cada por vez) em vez de concatenar, pra quem
      // rolar o carrossel ver a mistura logo de cara, não 8 iPads seguidos.
      const maxLen = Math.max(ipadProducts.length, airpodsProducts.length, watchProducts.length);
      for (let i = 0; i < maxLen; i++) {
        if (ipadProducts[i]) extraProducts.push(ipadProducts[i]);
        if (airpodsProducts[i]) extraProducts.push(airpodsProducts[i]);
        if (watchProducts[i]) extraProducts.push(watchProducts[i]);
      }

      // "A partir de" de cada categoria (pro carrossel "Todo o universo Apple") — o
      // mais barato entre TODOS os produtos precificados daquela categoria, não só
      // o primeiro da lista.
      CAROUSEL_CATEGORIES.forEach((slug) => {
        const priced = pricedBySlug[slug].filter((p) => p.pixPrice > 0);
        startingPrices[slug] = priced.length > 0 ? Math.min(...priced.map((p) => p.pixPrice)) : null;
      });

      // "A partir de" por produto específico (não por categoria) pro carrossel da
      // linha de MacBook — cada card é um produto (Neo/Air/Pro), não a categoria
      // "mac" inteira.
      MACBOOK_SLUGS.forEach((slug) => {
        const product = pricedBySlug.mac.find((p) => p.slug === slug);
        macbookPrices[slug] = product?.pixPrice > 0 ? product.pixPrice : null;
      });
    } catch (err) {
      console.error('[Home] Error fetching featured products:', err);
    }
  } else {
    console.error('[Home] Supabase client is null - env vars not configured');
  }

  return (
    <>
      <Header />

      <main>
        <HeroBanner />
        <FeaturesBar />
        <AppleUniverseCarousel startingPrices={startingPrices} />

        {iphoneProducts.length > 0 && (
          <FeaturedProducts products={iphoneProducts} title="iPhone em Destaque" />
        )}

        <CategoriesSection />
        <PromoBanner />
        <ShoppingAssistant />
        <MacBookLineupCarousel startingPrices={macbookPrices} />

        {extraProducts.length > 0 && (
          <section className="py-10 md:py-14 bg-gray-50">
            <div className="container mx-auto px-4">
              <FeaturedProducts products={extraProducts} title="iPad, AirPods e Apple Watch" compact />
            </div>
          </section>
        )}

        <TestimonialsSection />
      </main>

      <Footer />
    </>
  );
}
