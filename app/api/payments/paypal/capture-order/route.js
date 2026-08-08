import { NextResponse } from 'next/server';

const getPayPalBaseUrl = () =>
  process.env.PAYPAL_ENVIRONMENT === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
  const baseUrl = getPayPalBaseUrl();
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials não configuradas');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json();

  if (!data.access_token) {
    throw new Error('Falha ao obter token PayPal');
  }

  return data.access_token;
}

export async function POST(request) {
  try {
    const { paypalOrderId } = await request.json();

    if (!paypalOrderId) {
      return NextResponse.json(
        { success: false, error: 'paypalOrderId obrigatório' },
        { status: 400 }
      );
    }

    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();

    const captureRes = await fetch(
      `${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const captureData = await captureRes.json();

    if (captureData.status !== 'COMPLETED') {
      console.error('PayPal capture error:', captureData);
      return NextResponse.json(
        { success: false, error: 'Pagamento não aprovado pelo PayPal' },
        { status: 400 }
      );
    }

    // Extrair transaction ID da captura
    const transactionId =
      captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
      paypalOrderId;

    return NextResponse.json({
      success: true,
      transactionId,
      paypalOrderId,
    });
  } catch (error) {
    console.error('Error capturing PayPal order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao capturar pagamento PayPal' },
      { status: 500 }
    );
  }
}
