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

// Lê a resposta como texto primeiro — se a Asaas devolver algo que não é JSON
// (ex: página de erro HTML num 401/403 de chave inválida), `.json()` direto
// quebra sem mostrar nada útil no log. Isso garante que o log sempre mostre o
// status HTTP e o corpo cru, seja lá o que a Asaas mandou.
async function fetchAsaas(url, options, label) {
  const res = await fetch(url, options);
  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (parseErr) {
    console.error(`[Asaas] ${label} — resposta não é JSON (status ${res.status}):`, raw.slice(0, 500));
  }
  if (!res.ok) {
    console.error(`[Asaas] ${label} — HTTP ${res.status}:`, data || raw.slice(0, 500));
  }
  return { ok: res.ok, status: res.status, data };
}

export async function POST(request) {
  try {
    const { orderId, amount, customer } = await request.json();

    if (!orderId || !amount || !customer) {
      return NextResponse.json(
        { success: false, error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    if (!customer.cpf || !customer.phone) {
      return NextResponse.json(
        { success: false, error: 'CPF e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    if (!process.env.ASAAS_API_KEY) {
      console.error('[Asaas] ASAAS_API_KEY não configurada');
      return NextResponse.json(
        { success: false, error: 'Gateway de pagamento não configurado' },
        { status: 500 }
      );
    }

    const baseUrl = getAsaasBaseUrl();
    console.log(`[Asaas] create-pix — ambiente=${process.env.ASAAS_ENVIRONMENT || 'sandbox'} baseUrl=${baseUrl} orderId=${orderId}`);

    const cpf = customer.cpf.replace(/\D/g, '');
    const phone = customer.phone.replace(/\D/g, '');

    // 1. Criar cliente no Asaas
    const customerResult = await fetchAsaas(`${baseUrl}/customers`, {
      method: 'POST',
      headers: asaasHeaders(),
      body: JSON.stringify({
        name: customer.name,
        email: customer.email,
        phone,
        cpfCnpj: cpf,
        notificationDisabled: true,
      }),
    }, 'criar cliente');

    if (!customerResult.data?.id) {
      return NextResponse.json(
        { success: false, error: 'Erro ao criar cliente no gateway de pagamento' },
        { status: 500 }
      );
    }

    // 2. Criar cobrança PIX (vence em 30 minutos)
    const dueDate = new Date(Date.now() + 30 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const paymentResult = await fetchAsaas(`${baseUrl}/payments`, {
      method: 'POST',
      headers: asaasHeaders(),
      body: JSON.stringify({
        customer: customerResult.data.id,
        billingType: 'PIX',
        value: Number(amount.toFixed(2)),
        dueDate,
        description: `Pedido ${SITE_NAME} #${orderId}`,
        externalReference: String(orderId),
      }),
    }, 'criar cobrança PIX');

    if (!paymentResult.data?.id) {
      return NextResponse.json(
        { success: false, error: 'Erro ao criar cobrança PIX' },
        { status: 500 }
      );
    }

    // 3. Buscar QR Code PIX
    const qrResult = await fetchAsaas(
      `${baseUrl}/payments/${paymentResult.data.id}/pixQrCode`,
      { headers: asaasHeaders() },
      'buscar QR Code'
    );

    if (!qrResult.data?.encodedImage || !qrResult.data?.payload) {
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
          transaction_id: paymentResult.data.id,
          status: 'pending',
        })
        .eq('order_id', orderId)
        .eq('method', 'pix');
    }

    return NextResponse.json({
      success: true,
      data: {
        chargeId: paymentResult.data.id,
        qrCodeImage: qrResult.data.encodedImage,
        copyPasteCode: qrResult.data.payload,
        expiresAt: paymentResult.data.dueDate,
      },
    });
  } catch (error) {
    console.error('[Asaas] Exceção não tratada em create-pix:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao processar pagamento PIX' },
      { status: 500 }
    );
  }
}
