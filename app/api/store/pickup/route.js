import { NextResponse } from 'next/server';
import { getStoreSession } from '../../../../lib/storeAuth';
import { createServerClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = getStoreSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Serviço não configurado' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const token = (searchParams.get('token') || '').trim();
  if (!token) {
    return NextResponse.json({ success: false, error: 'Código não informado' }, { status: 400 });
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, customer_name, customer_email, customer_phone,
      pickup_location, pickup_location_id, pickup_travel_date, status, payment_status,
      delivered_at, total, created_at,
      pickup_locations ( name, address, city, state ),
      order_items ( product_name, quantity, variant_attributes )
    `)
    .eq('pickup_token', token)
    .single();

  if (error || !order) {
    return NextResponse.json({ success: false, error: 'Pedido não encontrado para esse código' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: order });
}

export async function POST(request) {
  const session = getStoreSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Serviço não configurado' }, { status: 500 });
  }

  const body = await request.json();
  const token = (body.token || '').trim();
  if (!token) {
    return NextResponse.json({ success: false, error: 'Código não informado' }, { status: 400 });
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_number, status, payment_status, delivered_at, pickup_location_id')
    .eq('pickup_token', token)
    .single();

  if (error || !order) {
    return NextResponse.json({ success: false, error: 'Pedido não encontrado para esse código' }, { status: 404 });
  }

  // Usuário atrelado a um local específico só confirma retiradas daquele local —
  // usuário sem local atribuído (pickupLocationId nulo) cobre qualquer um.
  if (session.pickupLocationId && order.pickup_location_id && session.pickupLocationId !== order.pickup_location_id) {
    return NextResponse.json({ success: false, error: 'Esse pedido é para retirada em outro local.' }, { status: 403 });
  }

  if (order.payment_status !== 'paid') {
    return NextResponse.json({ success: false, error: 'Esse pedido ainda não está com o pagamento confirmado — não é possível entregar.' }, { status: 400 });
  }

  if (order.status === 'delivered') {
    return NextResponse.json({ success: false, error: `Esse pedido já foi retirado em ${new Date(order.delivered_at).toLocaleString('pt-BR')}.` }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'delivered',
      delivered_at: new Date().toISOString(),
      delivered_by: session.userId,
    })
    .eq('id', order.id)
    .eq('pickup_token', token)
    .select('id, order_number, status, delivered_at')
    .single();

  if (updateError || !updated) {
    console.error('Error confirming pickup:', updateError);
    return NextResponse.json({ success: false, error: 'Erro ao confirmar retirada' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: updated });
}
