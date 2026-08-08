import { NextResponse } from 'next/server';
import { getAffiliateSession } from '../../../../lib/affiliateAuth';
import { createServerClient } from '../../../../lib/supabase/server';

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

    const { data: withdrawals, error } = await supabase
      .from('affiliate_withdrawals')
      .select('*')
      .eq('affiliate_id', session.id)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching withdrawals:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar saques' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: withdrawals || [],
    });
  } catch (error) {
    console.error('Withdrawals error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = getAffiliateSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { amount, pixKey } = await request.json();

    if (!amount || !pixKey) {
      return NextResponse.json(
        { success: false, error: 'Valor e chave PIX são obrigatórios' },
        { status: 400 }
      );
    }

    if (amount < 50) {
      return NextResponse.json(
        { success: false, error: 'Valor mínimo para saque é R$ 50,00' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Serviço não configurado' },
        { status: 500 }
      );
    }

    // Verificar saldo disponível
    const { data: orders } = await supabase
      .from('orders')
      .select('affiliate_amount')
      .eq('affiliate_id', session.id)
      .eq('payment_status', 'paid');

    const totalCommission = orders?.reduce((sum, order) => sum + parseFloat(order.affiliate_amount || 0), 0) || 0;

    const { data: withdrawals } = await supabase
      .from('affiliate_withdrawals')
      .select('amount, status')
      .eq('affiliate_id', session.id);

    const totalWithdrawn = withdrawals
      ?.filter(w => w.status === 'paid')
      .reduce((sum, w) => sum + parseFloat(w.amount || 0), 0) || 0;

    const pendingAmount = withdrawals
      ?.filter(w => w.status === 'pending' || w.status === 'processing')
      .reduce((sum, w) => sum + parseFloat(w.amount || 0), 0) || 0;

    const availableBalance = totalCommission - totalWithdrawn - pendingAmount;

    if (amount > availableBalance) {
      return NextResponse.json(
        { success: false, error: 'Saldo insuficiente' },
        { status: 400 }
      );
    }

    // Criar solicitação de saque
    const { data, error } = await supabase
      .from('affiliate_withdrawals')
      .insert({
        affiliate_id: session.id,
        amount,
        pix_key: pixKey,
        status: 'pending',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating withdrawal:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao criar solicitação de saque' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Withdrawal creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
