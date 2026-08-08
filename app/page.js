import Header from '../components/Header';
import Footer from '../components/Footer';
import HeroBanner from '../components/HeroBanner';
import FeaturesBar from '../components/FeaturesBar';
import CategoriesSection from '../components/CategoriesSection';
import FeaturedProducts from '../components/FeaturedProducts';
import PromoSection from '../components/PromoSection';
import PromoBanner from '../components/PromoBanner';
import TestimonialsSection from '../components/TestimonialsSection';
import { getCurrentContext } from '../lib/affiliateTracking';
import { createServerClient } from '../lib/supabase/server';
import { calculateAllPrices } from '../lib/pricing';

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
              const prices = calculateAllPrices({
                costPrice,
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

  return (
    <>
      <Header />

      <main>
        <HeroBanner />
        <FeaturesBar />
        <CategoriesSection />

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
