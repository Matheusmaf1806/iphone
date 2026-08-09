import { NextResponse } from 'next/server';
import { validateCoupon, applyCouponDiscount } from '../../../../lib/coupons';
import { calculateAllPrices, resolveCostPriceBRL } from '../../../../lib/pricing';
import { getPlatformConfig } from '../../../../lib/affiliateTracking';
import { supabase } from '../../../../lib/supabase/client';

// POST - Validar e calcular desconto do cupom
export async function POST(request) {
  try {
    const body = await request.json();
    const { code, affiliate_id, cart_items } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Código do cupom é obrigatório' },
        { status: 400 }
      );
    }

    if (!cart_items || cart_items.length === 0) {
      return NextResponse.json(
        { error: 'Carrinho vazio' },
        { status: 400 }
      );
    }

    const config = await getPlatformConfig();

    // Calcular total do pedido antes do desconto
    let subtotal = 0;
    const itemsWithPrices = [];

    for (const item of cart_items) {
      // Buscar produto
      const { data: product } = await supabase
        .from('products')
        .select('id, name, cost_price, cost_currency, import_tax_percentage, supplier_margin_percentage, stock_quantity')
        .eq('id', item.product_id)
        .single();

      if (!product) {
        return NextResponse.json(
          { error: `Produto ${item.product_id} não encontrado` },
          { status: 404 }
        );
      }

      // Buscar margem customizada do afiliado se houver
      let affiliateMargin = config.defaultAffiliateMargin;
      if (affiliate_id) {
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('commission_rate')
          .eq('id', affiliate_id)
          .single();

        affiliateMargin = affiliate?.commission_rate || config.defaultAffiliateMargin;

        // Verificar se há margem customizada para este produto
        const { data: customCommission } = await supabase
          .from('affiliate_product_commissions')
          .select('custom_commission_rate')
          .eq('affiliate_id', affiliate_id)
          .eq('product_id', product.id)
          .single();

        if (customCommission) {
          affiliateMargin = customCommission.custom_commission_rate;
        }
      }

      // Custo pode estar cadastrado em dólar — converte pra BRL + imposto de
      // importação antes de entrar na cascata de margens, mesma lógica usada em
      // toda a vitrine e no checkout.
      const costPriceBRL = resolveCostPriceBRL({
        costPrice: parseFloat(product.cost_price || 0),
        costCurrency: product.cost_currency,
        importTaxPercentage: product.import_tax_percentage,
        usdBrlRate: config.usdBrlRate,
        defaultImportTaxPercentage: config.defaultImportTaxPercentage,
      });

      // Calcular preços
      const prices = calculateAllPrices({
        costPrice: costPriceBRL,
        supplierMarginPercentage: product.supplier_margin_percentage,
        affiliateMarginPercentage: affiliateMargin,
        cardFeePercentage: config.cardFeePercentage,
      });

      const itemTotal = prices.pixPrice * item.quantity;
      subtotal += itemTotal;

      itemsWithPrices.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: prices.pixPrice,
        total: itemTotal,
        prices: prices,
        supplier_margin: product.supplier_margin_percentage,
        affiliate_margin: affiliateMargin
      });
    }

    // Validar cupom
    const validation = await validateCoupon(code, affiliate_id, subtotal);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, valid: false },
        { status: 400 }
      );
    }

    const coupon = validation.coupon;

    // Calcular desconto total aplicado ao carrinho
    let totalDiscount = 0;
    const itemsWithDiscount = itemsWithPrices.map(item => {
      const discountResult = applyCouponDiscount(
        coupon,
        item.prices,
        item.supplier_margin,
        item.affiliate_margin,
        config.cardFeePercentage
      );

      const itemDiscount = (item.unit_price - discountResult.discountedPrices.pixPrice) * item.quantity;
      totalDiscount += itemDiscount;

      return {
        ...item,
        discounted_unit_price: discountResult.discountedPrices.pixPrice,
        discounted_total: discountResult.discountedPrices.pixPrice * item.quantity,
        discount_amount: itemDiscount,
        discount_details: discountResult.discountDetails
      };
    });

    const newSubtotal = subtotal - totalDiscount;

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_percentage: coupon.discount_percentage,
        discount_source: coupon.discount_source
      },
      original_subtotal: subtotal,
      discount_amount: totalDiscount,
      new_subtotal: newSubtotal,
      items: itemsWithDiscount
    });

  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    return NextResponse.json(
      { error: 'Erro ao processar requisição', valid: false },
      { status: 500 }
    );
  }
}
