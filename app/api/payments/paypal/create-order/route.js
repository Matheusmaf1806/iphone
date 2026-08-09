import { NextResponse } from 'next/server';
import { SITE_NAME } from '../../../../../lib/siteConfig';
import { createServerClient } from '../../../../../lib/supabase/server';
import { getPlatformConfig } from '../../../../../lib/affiliateTracking';
import { priceCartItems } from '../../../../../lib/orderPricing';
import { getInstallmentFees, getFeeForInstallments } from '../../../../../lib/installmentFees';

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
    const { items, affiliateId, coupon, installments } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Carrinho vazio' },
        { status: 400 }
      );
    }

    // O valor cobrado nunca vem do navegador: é recalculado aqui a partir do
    // productId/variantId/quantity de cada item, com a mesma cascata de custo +
    // margens usada em /api/orders/create — senão uma requisição adulterada
    // conseguiria autorizar a cobrança por qualquer valor, mesmo que o pedido
    // criado depois no banco mostre o valor "correto".
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Serviço não configurado' },
        { status: 500 }
      );
    }

    const config = await getPlatformConfig();

    let affiliate = null;
    if (affiliateId) {
      const { data: affiliateData } = await supabase
        .from('affiliates')
        .select('id, commission_rate')
        .eq('id', affiliateId)
        .eq('is_active', true)
        .single();
      affiliate = affiliateData;
    }

    // A taxa do cartão varia por número de parcelas (installment_fees) — usa a taxa
    // exata do número de parcelas escolhido no checkout em vez da taxa fixa de
    // platform_config, senão o valor autorizado aqui não bate com o que o checkout
    // mostrou pro cliente.
    const installmentFees = await getInstallmentFees();
    const cardFeePercentage = getFeeForInstallments(installmentFees, parseInt(installments, 10) || 1);

    const priced = await priceCartItems({ supabase, items, affiliate, config, isPix: false, cardFeePercentageOverride: cardFeePercentage });
    if (priced.error) {
      return NextResponse.json({ success: false, error: priced.error }, { status: 400 });
    }

    let amount = priced.subtotal;
    if (coupon?.discount_amount) {
      amount -= coupon.discount_amount;
    }
    amount = parseFloat(amount.toFixed(2));

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
            description: `Pedido ${SITE_NAME}`,
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
