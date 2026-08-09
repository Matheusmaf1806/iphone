import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import CategoryContent from '../../../components/CategoryContent';
import { getCurrentContext } from '../../../lib/affiliateTracking';
import { createServerClient } from '../../../lib/supabase/server';
import { calculateAllPrices, resolveCostPriceBRL } from '../../../lib/pricing';
import { computeVariantRollup } from '../../../lib/products';

const categoryNames = {
  'iphone': 'iPhone',
  'mac': 'Mac',
  'ipad': 'iPad',
  'apple-watch': 'Apple Watch',
  'airpods': 'AirPods',
  'acessorios': 'Acessórios',
  'seminovos': 'Seminovos',
  'promocoes': 'Promoções',
};

export default async function CategoryPage({ params }) {
  const categoryName = categoryNames[params.slug] || params.slug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Produtos';

  // Detectar afiliado pelo domínio
  const { affiliate, config } = await getCurrentContext();

  // Buscar produtos da categoria do banco de dados
  const supabase = createServerClient();
  let categoryProducts = [];

  if (supabase) {
    try {
      // Try to match by category_slug first
      let { data: products, error } = await supabase
        .from('products')
        .select('*, variants:product_variants(*)')
        .eq('is_active', true)
        .eq('category_slug', params.slug)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Category] Error fetching products:', error);
      }

      // If no products by slug, try by category name
      if (!products || products.length === 0) {
        const { data: productsByName, error: nameError } = await supabase
          .from('products')
          .select('*, variants:product_variants(*)')
          .eq('is_active', true)
          .ilike('category', categoryName)
          .order('created_at', { ascending: false });

        if (!nameError && productsByName) {
          products = productsByName;
        }
      }

      if (products && products.length > 0) {
        categoryProducts = products.map(product => {
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
                price: prices.pixPrice,
                image: product.image_url,
                reviews: product.reviews_count || 0,
                inStock: product.stock > 0,
              };
            }
          } catch (err) {
            console.error('[Category] Price calc error for product:', product.id, err);
          }

          // Fallback: use stored price
          const fallbackPrice = parseFloat(product.price) || 0;
          return {
            ...product,
            pixPrice: fallbackPrice,
            cardPrice: fallbackPrice,
            displayPrice: fallbackPrice,
            price: fallbackPrice,
            image: product.image_url,
            reviews: product.reviews_count || 0,
            inStock: product.stock > 0,
          };
        });
      }
    } catch (err) {
      console.error('[Category] Error:', err);
    }
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gray-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center gap-2 text-sm text-gray-500">
              <a href="/" className="hover:text-gray-900 transition-colors">
                Início
              </a>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              <span className="text-gray-900 font-medium">{categoryName}</span>
            </nav>
          </div>
        </div>

        {/* Category Header - clean, minimal */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {categoryName}
            </h1>
            {categoryProducts.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {categoryProducts.length} {categoryProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <CategoryContent categoryName={categoryName} products={categoryProducts} />
      </main>

      <Footer />
    </>
  );
}
