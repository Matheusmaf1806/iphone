import { NextResponse } from 'next/server';
import { getAffiliateSession } from '../../../../lib/affiliateAuth';
import { createServerClient } from '../../../../lib/supabase/server';
import { calculateAllPrices, resolveCostPriceBRL } from '../../../../lib/pricing';
import { getPlatformConfig } from '../../../../lib/affiliateTracking';

// Forçar rota dinâmica (usa cookies)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = getAffiliateSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Serviço não configurado' },
        { status: 500 }
      );
    }

    // Buscar produtos ativos
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar produtos' },
        { status: 500 }
      );
    }

    const config = await getPlatformConfig();

    // Calcular preços com a margem do afiliado
    const productsWithPrices = products.map(product => {
      const costPriceBRL = resolveCostPriceBRL({
        costPrice: parseFloat(product.cost_price),
        costCurrency: product.cost_currency,
        importTaxPercentage: product.import_tax_percentage,
        usdBrlRate: config.usdBrlRate,
        defaultImportTaxPercentage: config.defaultImportTaxPercentage,
      });
      const prices = calculateAllPrices({
        costPrice: costPriceBRL,
        supplierMarginPercentage: parseFloat(product.supplier_margin_percentage),
        affiliateMarginPercentage: parseFloat(session.commissionPercentage),
        cardFeePercentage: config.cardFeePercentage,
      });

      // Calcular comissão unitária
      const commission = prices.pixPrice - prices.netPrice;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        category: product.category,
        image_url: product.image_url,
        stock_quantity: product.stock_quantity,
        cost_price: product.cost_price,
        supplier_margin_percentage: product.supplier_margin_percentage || 10.00,
        prices: {
          pix: prices.pixPrice,
          card: prices.finalPrice,
        },
        commission,
        affiliateLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://folhadeguine.com.br'}/produto/${product.slug}?ref=${session.username}`,
      };
    });

    return NextResponse.json({
      success: true,
      data: productsWithPrices,
    });
  } catch (error) {
    console.error('Products error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
