import { NextResponse } from 'next/server';
import { getAffiliateSession } from '../../../../lib/affiliateAuth';
import { createServerClient } from '../../../../lib/supabase/server';

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

    // Buscar pedidos do afiliado
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('affiliate_id', session.affiliateId)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar pedidos' },
        { status: 500 }
      );
    }

    // Calcular estatísticas
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalSales = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total || 0), 0) || 0;
    const totalCommission = orders?.reduce((sum, order) => sum + parseFloat(order.affiliate_amount || 0), 0) || 0;

    const monthOrders = orders?.filter(order => new Date(order.created_at) >= startOfMonth) || [];
    const monthSalesCount = monthOrders.length;
    const monthRevenue = monthOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
    const monthCommission = monthOrders.reduce((sum, order) => sum + parseFloat(order.affiliate_amount || 0), 0);

    // Buscar saques
    const { data: withdrawals } = await supabase
      .from('affiliate_withdrawals')
      .select('*')
      .eq('affiliate_id', session.affiliateId)
      .order('requested_at', { ascending: false });

    const paidWithdrawals = withdrawals?.filter(w => w.status === 'paid') || [];
    const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending' || w.status === 'processing') || [];

    const totalWithdrawn = paidWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
    const pendingBalance = pendingWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
    const availableBalance = totalCommission - totalWithdrawn - pendingBalance;

    // Buscar itens dos pedidos para calcular top produtos
    let topProductsList = [];
    if (orders && orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, products(name)')
        .in('order_id', orderIds);

      if (orderItems && orderItems.length > 0) {
        const productSales = {};
        orderItems.forEach(item => {
          const productName = item.products?.name || item.product_name || 'Produto sem nome';
          if (!productSales[productName]) {
            productSales[productName] = {
              name: productName,
              sales: 0,
              commission: 0,
            };
          }
          productSales[productName].sales += item.quantity || 0;
          productSales[productName].commission += parseFloat(item.affiliate_amount_unit || 0) * (item.quantity || 0);
        });

        topProductsList = Object.values(productSales)
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 3);
      }
    }

    // Vendas recentes
    const recentSales = orders?.slice(0, 5).map(order => ({
      id: order.order_number || `#${order.id}`,
      date: order.created_at,
      customer: order.customer_name || order.customer_email || 'Cliente',
      total: parseFloat(order.total || 0),
      commission: parseFloat(order.affiliate_amount || 0),
      status: order.payment_status,
    })) || [];

    return NextResponse.json({
      success: true,
      data: {
        totalSales,
        totalRevenue,
        totalCommission,
        availableBalance: Math.max(0, availableBalance),
        pendingBalance,
        monthSales: monthSalesCount,
        monthRevenue,
        monthCommission,
        topProducts: topProductsList,
        recentSales,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
