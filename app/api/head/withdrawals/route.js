import { NextResponse } from 'next/server';
import { getHeadSession } from '../../../../lib/headAuth';
import { createServerClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = getHeadSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Serviço não configurado' }, { status: 500 });
  }

  const { data: withdrawals, error } = await supabase
    .from('head_withdrawals')
    .select('*')
    .eq('head_id', session.headId)
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('Error fetching head withdrawals:', error);
    return NextResponse.json({ success: false, error: 'Erro ao buscar saques' }, { status: 500 });
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('head_commission_amount')
    .eq('head_id', session.headId)
    .eq('payment_status', 'paid');

  const totalCommission = orders?.reduce((sum, o) => sum + parseFloat(o.head_commission_amount || 0), 0) || 0;
  const totalWithdrawn = (withdrawals || []).filter((w) => w.status === 'paid').reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
  const pendingAmount = (withdrawals || []).filter((w) => w.status === 'pending' || w.status === 'processing').reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
  const availableBalance = parseFloat((totalCommission - totalWithdrawn - pendingAmount).toFixed(2));

  return NextResponse.json({ success: true, data: withdrawals || [], availableBalance });
}

export async function POST(request) {
  const session = getHeadSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const { amount, pixKey } = await request.json();

  if (!amount || !pixKey) {
    return NextResponse.json({ success: false, error: 'Valor e chave PIX são obrigatórios' }, { status: 400 });
  }
  if (amount < 50) {
    return NextResponse.json({ success: false, error: 'Valor mínimo para saque é R$ 50,00' }, { status: 400 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Serviço não configurado' }, { status: 500 });
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('head_commission_amount')
    .eq('head_id', session.headId)
    .eq('payment_status', 'paid');

  const totalCommission = orders?.reduce((sum, o) => sum + parseFloat(o.head_commission_amount || 0), 0) || 0;

  const { data: withdrawals } = await supabase
    .from('head_withdrawals')
    .select('amount, status')
    .eq('head_id', session.headId);

  const totalWithdrawn = withdrawals?.filter((w) => w.status === 'paid').reduce((sum, w) => sum + parseFloat(w.amount || 0), 0) || 0;
  const pendingAmount = withdrawals?.filter((w) => w.status === 'pending' || w.status === 'processing').reduce((sum, w) => sum + parseFloat(w.amount || 0), 0) || 0;
  const availableBalance = totalCommission - totalWithdrawn - pendingAmount;

  if (amount > availableBalance) {
    return NextResponse.json({ success: false, error: 'Saldo insuficiente' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('head_withdrawals')
    .insert({
      head_id: session.headId,
      amount,
      pix_key: pixKey,
      status: 'pending',
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating head withdrawal:', error);
    return NextResponse.json({ success: false, error: 'Erro ao criar solicitação de saque' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
