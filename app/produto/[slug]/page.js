import { notFound } from 'next/navigation';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProductGallery from '../../../components/ProductGallery';
import ProductActions from '../../../components/ProductActions';
import ProductTabs from '../../../components/ProductTabs';
import ProductInfo from '../../../components/ProductInfo';
import FeaturedProducts from '../../../components/FeaturedProducts';
import ComboSuggestion from '../../../components/CrossSellCarousel';
import { getProduct, getRelatedProducts, getCrossSellProducts } from '../../../lib/products';
import { getCurrentContext } from '../../../lib/affiliateTracking';
import { calculateAllPrices } from '../../../lib/pricing';

// Category display names
const CATEGORY_NAMES = {
  'iphone': 'iPhone',
  'mac': 'Mac',
  'ipad': 'iPad',
  'apple-watch': 'Apple Watch',
  'airpods': 'AirPods',
  'acessorios': 'Acessórios',
  'seminovos': 'Seminovos',
  'promocoes': 'Promoções',
};

function priceOne(costPrice, supplierMarginPercentage, affiliate, config) {
  return calculateAllPrices({
    costPrice,
    supplierMarginPercentage,
    affiliateMarginPercentage: affiliate?.commission_percentage || config.defaultAffiliateMargin,
    cardFeePercentage: config.cardFeePercentage,
  });
}

function applyPrices(product, affiliate, config) {
  let p = { ...product };
  if (product.costPrice) {
    const prices = priceOne(product.costPrice, product.supplierMarginPercentage, affiliate, config);
    p.pixPrice = prices.pixPrice;
    p.cardPrice = prices.finalPrice;
    p.displayPrice = prices.pixPrice;
    p.price = prices.pixPrice;
    p.installmentValue = prices.finalPrice / (product.installments || 3);
  } else {
    p.displayPrice = product.price;
    p.pixPrice = product.price;
    p.cardPrice = product.price;
  }

  // Cada SKU tem seu próprio custo (e, opcionalmente, sua própria margem) — precifica
  // cada variante individualmente reaproveitando a mesma cascata de preço do produto.
  if (product.hasVariants && product.variants?.length > 0) {
    p.variants = product.variants
      .filter(v => v.costPrice != null && v.costPrice > 0)
      .map(v => {
        const prices = priceOne(
          v.costPrice,
          v.supplierMarginPercentage ?? product.supplierMarginPercentage,
          affiliate,
          config
        );
        return {
          ...v,
          pixPrice: prices.pixPrice,
          cardPrice: prices.finalPrice,
          installmentValue: prices.finalPrice / (product.installments || 3),
        };
      });
  }

  return p;
}

export default async function ProductPage({ params }) {
  const product = await getProduct(params.slug);

  if (!product) {
    notFound();
  }

  // Detectar afiliado pelo domínio
  const { affiliate, config } = await getCurrentContext();

  // Calcular preços do produto principal
  const productWithPrices = applyPrices(product, affiliate, config);

  // Buscar produtos relacionados e cross-sell em paralelo
  const [relatedRaw, crossSellRaw] = await Promise.all([
    getRelatedProducts(product.id, product.category, 10),
    getCrossSellProducts(product.id, product.category, 1),
  ]);

  // Aplicar precificação do afiliado
  const relatedProducts = relatedRaw.map(p => applyPrices(p, affiliate, config));
  const crossSellProducts = crossSellRaw.map(p => applyPrices(p, affiliate, config));

  const categoryName = CATEGORY_NAMES[product.category] || product.category || 'Produtos';

  return (
    <>
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-6 fade-in-section">
          <a href="/" className="hover:text-custom-yellow">
            Início
          </a>{' '}
          &gt;{' '}
          {product.category && (
            <>
              <a href={`/categoria/${product.category}`} className="hover:text-custom-yellow">
                {categoryName}
              </a>{' '}
              &gt;{' '}
            </>
          )}
          <span className="text-gray-900 font-medium">{productWithPrices.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
          {/* Product Images */}
          <ProductGallery images={productWithPrices.images} />

          {/* Product Details */}
          <ProductInfo product={productWithPrices}>
            <ProductActions product={productWithPrices} />
          </ProductInfo>
        </div>

        {/* Cross-sell inteligente - Combo sugestão */}
        {crossSellProducts.length > 0 && (
          <ComboSuggestion
            currentProduct={productWithPrices}
            suggestedProduct={crossSellProducts[0]}
          />
        )}

        {/* Tabs de Descrição e Avaliações */}
        <ProductTabs product={productWithPrices} />

        {/* Produtos da mesma categoria */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <FeaturedProducts
              products={relatedProducts}
              title={`Mais em ${categoryName}`}
            />
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
