import { NextResponse } from 'next/server';
import { getHeadSession } from '../../../../lib/headAuth';
import { createServerClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

// Vendas da PRÓPRIA loja do Head (quando ele também vende) — não confundir com a
// rede: aqui é o Head funcionando como um afiliado normal, vendo os pedidos da
// loja vinculada a ele (session.ownAffiliateId).
export async function GET() {
  const session = getHeadSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }
  if (!session.ownAffiliateId) {
    return NextResponse.json({ success: false, error: 'Este Head não tem loja própria' }, { status: 400 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Serviço não configurado' }, { status: 500 });
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, payment_method, payment_status, status, total, affiliate_amount, created_at, order_items(product_name, quantity)')
    .eq('affiliate_id', session.ownAffiliateId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching head sales:', error);
    return NextResponse.json({ success: false, error: 'Erro ao buscar pedidos' }, { status: 500 });
  }

  const formatted = (orders || []).map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    items: order.order_items?.map((i) => ({ productName: i.product_name, quantity: i.quantity })) || [],
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    status: order.status,
    total: parseFloat(order.total),
    commission: parseFloat(order.affiliate_amount),
    createdAt: order.created_at,
  }));

  return NextResponse.json({ success: true, data: formatted });
}
