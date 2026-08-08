import { NextResponse } from 'next/server';
import { createServerClient } from '../../../../../lib/supabase/server';
import { SITE_NAME } from '../../../../../lib/siteConfig';

const getAsaasBaseUrl = () =>
  process.env.ASAAS_ENVIRONMENT === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';

const asaasHeaders = () => ({
  'access_token': process.env.ASAAS_API_KEY,
  'Content-Type': 'application/json',
});

export async function POST(request) {
  try {
    const { orderId, amount, customer } = await request.json();

    if (!orderId || !amount || !customer) {
      return NextResponse.json(
        { success: false, error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    if (!process.env.ASAAS_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gateway de pagamento não configurado' },
        { status: 500 }
      );
    }

    const baseUrl = getAsaasBaseUrl();
    const cpf = customer.cpf.replace(/\D/g, '');
    const phone = customer.phone.replace(/\D/g, '');

    // 1. Criar cliente no Asaas
    const customerRes = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: asaasHeaders(),
      body: JSON.stringify({
        name: customer.name,
        email: customer.email,
        phone,
        cpfCnpj: cpf,
        notificationDisabled: true,
      }),
    });

    const customerData = await customerRes.json();

    if (!customerData.id) {
      console.error('Asaas customer error:', customerData);
      return NextResponse.json(
        { success: false, error: 'Erro ao criar cliente no gateway de pagamento' },
        { status: 500 }
      );
    }

    // 2. Criar cobrança PIX (vence em 30 minutos)
    const dueDate = new Date(Date.now() + 30 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const paymentRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: asaasHeaders(),
      body: JSON.stringify({
        customer: customerData.id,
        billingType: 'PIX',
        value: Number(amount.toFixed(2)),
        dueDate,
        description: `Pedido ${SITE_NAME} #${orderId}`,
        externalReference: String(orderId),
      }),
    });

    const paymentData = await paymentRes.json();

    if (!paymentData.id) {
      console.error('Asaas payment error:', paymentData);
      return NextResponse.json(
        { success: false, error: 'Erro ao criar cobrança PIX' },
        { status: 500 }
      );
    }

    // 3. Buscar QR Code PIX
    const qrRes = await fetch(
      `${baseUrl}/payments/${paymentData.id}/pixQrCode`,
      { headers: asaasHeaders() }
    );
    const qrData = await qrRes.json();

    if (!qrData.encodedImage || !qrData.payload) {
      console.error('Asaas QR code error:', qrData);
      return NextResponse.json(
        { success: false, error: 'Erro ao gerar QR Code PIX' },
        { status: 500 }
      );
    }

    // 4. Atualizar registro de pagamento no banco com o ID da cobrança Asaas
    const supabase = createServerClient();
    if (supabase) {
      await supabase
        .from('payments')
        .update({
          transaction_id: paymentData.id,
          status: 'pending',
        })
        .eq('order_id', orderId)
        .eq('method', 'pix');
    }

    return NextResponse.json({
      success: true,
      data: {
        chargeId: paymentData.id,
        qrCodeImage: qrData.encodedImage,
        copyPasteCode: qrData.payload,
        expiresAt: paymentData.dueDate,
      },
    });
  } catch (error) {
    console.error('Error creating Asaas PIX charge:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao processar pagamento PIX' },
      { status: 500 }
    );
  }
}
