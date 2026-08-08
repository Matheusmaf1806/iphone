import { NextResponse } from 'next/server';
import { createServerClient } from '../../../../../lib/supabase/server';

export async function POST(request) {
  try {
    // Verificar token de segurança do Asaas (configurado no painel)
    const accessToken = request.headers.get('asaas-access-token');
    if (process.env.ASAAS_WEBHOOK_TOKEN && accessToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { event, payment } = body;

    // Eventos de pagamento confirmado
    const confirmedEvents = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];

    if (!confirmedEvents.includes(event)) {
      // Ignorar outros eventos (PAYMENT_OVERDUE, PAYMENT_DELETED, etc.)
      return NextResponse.json({ received: true });
    }

    if (!payment?.id) {
      return NextResponse.json({ received: true });
    }

    const supabase = createServerClient();
    if (!supabase) {
      console.error('Supabase client not available in webhook');
      return NextResponse.json({ received: true });
    }

    // Buscar pagamento pelo transaction_id (chargeId do Asaas)
    const { data: paymentRecord } = await supabase
      .from('payments')
      .select('order_id, status')
      .eq('transaction_id', payment.id)
      .single();

    if (!paymentRecord) {
      // Pode ser que o check-status já tenha processado, ignorar
      return NextResponse.json({ received: true });
    }

    if (paymentRecord.status === 'completed') {
      // Já processado, ignorar duplicata
      return NextResponse.json({ received: true });
    }

    // Atualizar status do pagamento e do pedido
    await Promise.all([
      supabase
        .from('payments')
        .update({ status: 'completed' })
        .eq('transaction_id', payment.id),
      supabase
        .from('orders')
        .update({ status: 'paid', payment_status: 'paid' })
        .eq('id', paymentRecord.order_id),
    ]);

    console.log(`[Asaas Webhook] Payment ${payment.id} confirmed for order ${paymentRecord.order_id}`);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Asaas webhook error:', error);
    // Retornar 200 para o Asaas não reenviar indefinidamente
    return NextResponse.json({ received: true });
  }
}
