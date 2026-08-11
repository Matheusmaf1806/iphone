import { NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase/server';
import { requireAuth } from '../../../lib/auth';
import { getUsdBrlRate } from '../../../lib/exchangeRate';

// Rótulos amigáveis pra tela de configurações — qualquer chave nova em
// platform_config aparece automaticamente, mas com esses rótulos fica legível.
const CONFIG_LABELS = {
  card_fee_percentage: { label: 'Taxa do cartão de crédito', suffix: '%', help: 'Custo do cartão repassado no preço final (parcelamento em até 10x).' },
  pix_discount_percentage: { label: 'Desconto no PIX', suffix: '%', help: 'Desconto aplicado sobre o preço quando o cliente paga via PIX.' },
  default_affiliate_margin: { label: 'Margem padrão de afiliado', suffix: '%', help: 'Usada quando o afiliado não tem uma comissão customizada.' },
  usd_brl_rate: { label: 'Cotação do dólar (USD → BRL)', suffix: '', help: 'Cotação automática (PTAX do Banco Central + IOF 3,5% + spread 1,5%). Este valor só é usado como reserva se a API do Banco Central estiver fora do ar.' },
  default_import_tax_percentage: { label: 'Imposto de importação padrão', suffix: '%', help: 'Aplicado sobre o custo quando o produto/SKU não tiver um imposto próprio.' },
};

export async function GET() {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('platform_config')
      .select('*')
      .order('key');

    if (error) throw error;

    // Cotação ao vivo (PTAX + IOF + spread) — sobrepõe o valor salvo no banco só
    // na resposta, pra qualquer preview de custo no admin (ProductModal,
    // ProductVariantsManager) bater com o que é realmente cobrado do cliente.
    const savedRateRow = data.find(row => row.key === 'usd_brl_rate');
    const liveRate = await getUsdBrlRate(savedRateRow ? parseFloat(savedRateRow.value) : undefined);

    const enriched = data.map(row => ({
      ...row,
      ...(CONFIG_LABELS[row.key] || { label: row.key, suffix: '' }),
      ...(row.key === 'usd_brl_rate' ? { live_value: liveRate } : {}),
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Error fetching platform config:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { key, value } = await request.json();
    if (!key || value === undefined || value === null || value === '') {
      return NextResponse.json({ success: false, error: 'key e value são obrigatórios' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('platform_config')
      .update({ value: String(value) })
      .eq('key', key)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ success: false, error: 'Configuração não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating platform config:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
