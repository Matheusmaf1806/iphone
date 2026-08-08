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
    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valor inválido' },
        { status: 400 }
      );
    }

    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();

    const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'BRL',
              value: Number(amount).toFixed(2),
            },
            description: 'Pedido BrandPet',
          },
        ],
      }),
    });

    const orderData = await orderRes.json();

    if (!orderData.id) {
      console.error('PayPal create order error:', orderData);
      return NextResponse.json(
        { success: false, error: 'Erro ao criar pedido no PayPal' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paypalOrderId: orderData.id,
    });
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao criar pedido PayPal' },
      { status: 500 }
    );
  }
}
