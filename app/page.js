import Header from '../components/Header';
import Footer from '../components/Footer';
import HeroBanner from '../components/HeroBanner';
import ShoppingAssistant from '../components/ShoppingAssistant';
import FeaturesBar from '../components/FeaturesBar';
import CategoriesSection from '../components/CategoriesSection';
import AppleUniverseCarousel from '../components/AppleUniverseCarousel';
import FeaturedProducts from '../components/FeaturedProducts';
import PromoSection from '../components/PromoSection';
import PromoBanner from '../components/PromoBanner';
import TestimonialsSection from '../components/TestimonialsSection';
import { getCurrentContext } from '../lib/affiliateTracking';
import { createServerClient } from '../lib/supabase/server';
import { calculateAllPrices, resolveCostPriceBRL } from '../lib/pricing';

const CAROUSEL_CATEGORIES = ['iphone', 'mac', 'apple-watch', 'airpods', 'acessorios'];

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

  // Buscar produtos do banco de dados
  const supabase = createServerClient();
  let productsWithPrices = [];

  if (supabase) {
    try {
      // Primeiro tenta buscar produtos em destaque
      let { data: products, error: featuredError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (featuredError) {
        console.error('[Home] Error fetching featured products:', featuredError);
      }

      // Se não houver produtos em destaque, busca todos os ativos
      if (!products || products.length === 0) {
        const { data: allProducts, error: allError } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(6);

        if (allError) {
          console.error('[Home] Error fetching all products:', allError);
        }
        products = allProducts;
      }

      if (products && products.length > 0) {
        productsWithPrices = products.map(product => {
          try {
            const costPrice = parseFloat(product.cost_price) || 0;
            const supplierMargin = parseFloat(product.supplier_margin_percentage) || 10;
            const affiliateMargin = parseFloat(affiliate?.commission_percentage) || config.defaultAffiliateMargin;

            if (costPrice > 0) {
              const costPriceBRL = resolveCostPriceBRL({
                costPrice,
                costCurrency: product.cost_currency,
                importTaxPercentage: product.import_tax_percentage,
                usdBrlRate: config.usdBrlRate,
                defaultImportTaxPercentage: config.defaultImportTaxPercentage,
              });
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
    } catch (err) {
      console.error('[Home] Error fetching products:', err);
    }
  } else {
    console.error('[Home] Supabase client is null - env vars not configured');
  }

  // Preço "a partir de" (mais barato ativo) por categoria, pro carrossel
  const startingPrices = {};
  if (supabase) {
    try {
      const affiliateMargin = parseFloat(affiliate?.commission_percentage) || config.defaultAffiliateMargin;

      const results = await Promise.all(
        CAROUSEL_CATEGORIES.map((slug) =>
          supabase
            .from('products')
            .select('cost_price, supplier_margin_percentage, price')
            .eq('category', slug)
            .eq('is_active', true)
            .order('price', { ascending: true })
            .limit(1)
            .maybeSingle()
        )
      );

      CAROUSEL_CATEGORIES.forEach((slug, i) => {
        const cheapest = results[i]?.data;
        if (!cheapest) {
          startingPrices[slug] = null;
          return;
        }

        const costPrice = parseFloat(cheapest.cost_price) || 0;
        if (costPrice > 0) {
          try {
            const prices = calculateAllPrices({
              costPrice,
              supplierMarginPercentage: parseFloat(cheapest.supplier_margin_percentage) || 10,
              affiliateMarginPercentage: affiliateMargin,
              cardFeePercentage: config.cardFeePercentage,
            });
            startingPrices[slug] = prices.pixPrice;
            return;
          } catch (err) {
            console.error('[Home] Carousel price calc error for category:', slug, err);
          }
        }

        startingPrices[slug] = parseFloat(cheapest.price) || null;
      });
    } catch (err) {
      console.error('[Home] Error fetching carousel starting prices:', err);
    }
  }

  return (
    <>
      <Header />

      <main>
        <HeroBanner />
        <ShoppingAssistant />
        <FeaturesBar />
        <CategoriesSection />
        <AppleUniverseCarousel startingPrices={startingPrices} />

        {productsWithPrices.length > 0 && (
          <FeaturedProducts products={productsWithPrices} />
        )}

        <PromoSection />

        {productsWithPrices.length > 0 && (
          <FeaturedProducts products={productsWithPrices} />
        )}

        <PromoBanner />
        <TestimonialsSection />
      </main>

      <Footer />
    </>
  );
}
