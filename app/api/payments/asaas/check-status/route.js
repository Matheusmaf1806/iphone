import { NextResponse } from 'next/server';
import { createServerClient } from '../../../../../lib/supabase/server';

const getAsaasBaseUrl = () =>
  process.env.ASAAS_ENVIRONMENT === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const chargeId = searchParams.get('chargeId');

    if (!chargeId) {
      return NextResponse.json(
        { success: false, error: 'chargeId obrigatório' },
        { status: 400 }
      );
    }

    if (!process.env.ASAAS_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gateway não configurado' },
        { status: 500 }
      );
    }

    const baseUrl = getAsaasBaseUrl();

    const res = await fetch(`${baseUrl}/payments/${chargeId}`, {
      headers: { 'access_token': process.env.ASAAS_API_KEY },
    });

    const data = await res.json();

    // Asaas statuses: PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED, CANCELLED
    const confirmed = data.status === 'RECEIVED' || data.status === 'CONFIRMED';

    if (confirmed) {
      const supabase = createServerClient();
      if (supabase) {
        // Buscar payment pelo transaction_id para obter o order_id
        const { data: payment } = await supabase
          .from('payments')
          .select('order_id')
          .eq('transaction_id', chargeId)
          .single();

        if (payment?.order_id) {
          await Promise.all([
            supabase
              .from('payments')
              .update({ status: 'completed' })
              .eq('transaction_id', chargeId),
            supabase
              .from('orders')
              .update({ status: 'paid' })
              .eq('id', payment.order_id),
          ]);
        }
      }
    }

    return NextResponse.json({ status: data.status, confirmed });
  } catch (error) {
    console.error('Error checking Asaas PIX status:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao verificar status do pagamento' },
      { status: 500 }
    );
  }
}
