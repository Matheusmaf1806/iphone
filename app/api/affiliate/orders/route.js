import { NextResponse } from 'next/server';
import { getAffiliateSession } from '../../../../lib/affiliateAuth';
import { createServerClient } from '../../../../lib/supabase/server';

// Forçar rota dinâmica (usa cookies)
export const dynamic = 'force-dynamic';

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase
      .from('orders')
      .select('*, order_items(*, product:products(name, image_url))')
      .eq('affiliate_id', session.id)
      .order('created_at', { ascending: false });

    // Filtros
    if (status) {
      query = query.eq('payment_status', status);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar pedidos' },
        { status: 500 }
      );
    }

    // Formatar dados
    const formattedOrders = orders?.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      customer: {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
      },
      items: order.order_items?.map(item => ({
        id: item.id,
        productName: item.product_name,
        productImage: item.product?.image_url || item.product_image_url,
        quantity: item.quantity,
        price: parseFloat(item.final_price),
        commission: parseFloat(item.affiliate_amount_unit) * item.quantity,
      })) || [],
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      status: order.status,
      total: parseFloat(order.total),
      commission: parseFloat(order.affiliate_amount),
      createdAt: order.created_at,
      paidAt: order.paid_at,
      shippedAt: order.shipped_at,
      deliveredAt: order.delivered_at,
    })) || [];

    return NextResponse.json({
      success: true,
      data: formattedOrders,
    });
  } catch (error) {
    console.error('Orders error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
