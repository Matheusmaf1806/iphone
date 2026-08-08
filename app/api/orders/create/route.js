import { NextResponse } from 'next/server';
import { createServerClient } from '../../../../lib/supabase/server';
import { calculateAllPrices } from '../../../../lib/pricing';
import { getPlatformConfig } from '../../../../lib/affiliateTracking';
import { registerCouponUsage } from '../../../../lib/coupons';

export async function POST(request) {
  try {
    const body = await request.json();
    const { customer, pickup, payment, items, affiliateId, coupon } = body;

    // Validação básica
    if (!customer || !pickup || !payment || !items || items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Dados do pedido incompletos',
      }, { status: 400 });
    }

    if (!pickup.travelDate || !pickup.pickupLocation || !pickup.termsAccepted) {
      return NextResponse.json({
        success: false,
        error: 'Dados de retirada incompletos',
      }, { status: 400 });
    }

    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Serviço não configurado',
      }, { status: 500 });
    }

    // Obter configurações da plataforma
    const config = await getPlatformConfig();

    // Buscar dados do afiliado se houver
    let affiliate = null;
    if (affiliateId) {
      const { data: affiliateData } = await supabase
        .from('affiliates')
        .select('id, username, commission_percentage')
        .eq('id', affiliateId)
        .eq('is_active', true)
        .single();

      affiliate = affiliateData;
    }

    // Calcular totais do pedido
    let orderSubtotal = 0;
    let orderTotal = 0;
    let totalAffiliateCommission = 0;
    let totalSupplierAmount = 0;
    let totalCardFee = 0;

    // Buscar nomes dos produtos
    const productIds = items.map(item => item.productId);
    const { data: products } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds);
    const productNameMap = Object.fromEntries((products || []).map(p => [p.id, p.name]));

    const itemsWithPrices = items.map(item => {
      // Use customMarkup from agent if provided, otherwise use affiliate commission or default
      const affiliateMargin = (item.customMarkup !== null && item.customMarkup !== undefined)
        ? item.customMarkup
        : (affiliate?.commission_percentage || config.defaultAffiliateMargin);

      const prices = calculateAllPrices({
        costPrice: item.costPrice,
        supplierMarginPercentage: item.supplierMarginPercentage,
        affiliateMarginPercentage: affiliateMargin,
        cardFeePercentage: config.cardFeePercentage,
      });

      const isPix = payment.method === 'pix';
      const unitPrice = isPix ? prices.pixPrice : prices.finalPrice;
      const itemTotal = unitPrice * item.quantity;

      // Calcular valores para cada parte
      const supplierAmount = (prices.netPrice - prices.costPrice) * item.quantity;
      const affiliateAmount = (prices.pixPrice - prices.netPrice) * item.quantity;
      const cardFeeAmount = isPix ? 0 : (prices.finalPrice - prices.pixPrice) * item.quantity;

      orderSubtotal += itemTotal;
      totalSupplierAmount += supplierAmount;
      totalAffiliateCommission += affiliateAmount;
      totalCardFee += cardFeeAmount;

      return {
        product_id: item.productId,
        product_name: productNameMap[item.productId] || '',
        quantity: item.quantity,
        cost_price: prices.costPrice,
        supplier_margin_percentage: item.supplierMarginPercentage,
        affiliate_margin_percentage: affiliateMargin,
        card_fee_percentage: isPix ? 0 : config.cardFeePercentage,
        net_price: prices.netPrice,
        pix_price: prices.pixPrice,
        final_price: prices.finalPrice,
        unit_price: unitPrice,
        total_price: itemTotal,
        supplier_amount_unit: parseFloat((prices.netPrice - prices.costPrice).toFixed(2)),
        affiliate_amount_unit: parseFloat((prices.pixPrice - prices.netPrice).toFixed(2)),
        card_fee_amount_unit: isPix ? 0 : parseFloat((prices.finalPrice - prices.pixPrice).toFixed(2)),
      };
    });

    // Aplicar desconto do cupom se houver
    const couponDiscount = coupon ? coupon.discount_amount : 0;
    const subtotalAfterCoupon = orderSubtotal - couponDiscount;

    // Aplicar desconto PIX no subtotal se for o caso (após cupom)
    const pixDiscount = payment.method === 'pix' ? subtotalAfterCoupon * (config.pixDiscountPercentage / 100) : 0;
    orderTotal = subtotalAfterCoupon - pixDiscount;

    // Criar pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: customer.fullName,
        customer_email: customer.email,
        customer_phone: customer.phone,
        customer_cpf: customer.cpf,
        pickup_travel_date: pickup.travelDate,
        pickup_location: pickup.pickupLocation,
        pickup_travel_notes: pickup.travelNotes || null,
        pickup_terms_accepted: pickup.termsAccepted,
        payment_method: payment.method,
        subtotal: orderSubtotal,
        coupon_discount: couponDiscount,
        pix_discount: pixDiscount,
        total: orderTotal,
        affiliate_id: affiliate?.id || null,
        affiliate_commission: totalAffiliateCommission,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao criar pedido',
      }, { status: 500 });
    }

    // Criar itens do pedido
    const orderItems = itemsWithPrices.map(item => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Tentar reverter o pedido
      await supabase.from('orders').delete().eq('id', order.id);

      return NextResponse.json({
        success: false,
        error: 'Erro ao criar itens do pedido',
      }, { status: 500 });
    }

    // Se for PIX, criar registro de pagamento pendente
    if (payment.method === 'pix') {
      await supabase.from('payments').insert({
        order_id: order.id,
        method: 'pix',
        amount: orderTotal,
        status: 'pending',
      });
    }

    // Se for cartão, processar pagamento
    if (payment.method === 'credit-card') {
      await supabase.from('payments').insert({
        order_id: order.id,
        method: 'credit-card',
        amount: orderTotal,
        status: 'pending',
      });
    }

    // Se for PayPal, registrar transação
    if (payment.method === 'paypal') {
      await supabase.from('payments').insert({
        order_id: order.id,
        method: 'paypal',
        amount: orderTotal,
        status: payment.paypalTransactionId ? 'completed' : 'pending',
        transaction_id: payment.paypalTransactionId || null,
      });
    }

    // Registrar uso do cupom se houver
    if (coupon && coupon.id) {
      await registerCouponUsage(coupon.id, order.id, couponDiscount);
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        total: orderTotal,
        paymentMethod: payment.method,
      },
    });
  } catch (error) {
    console.error('Error processing order:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar pedido',
    }, { status: 500 });
  }
}
