import { NextResponse } from 'next/server';
import { createServerClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const INACTIVITY_DAYS = 90;

// Chamado diariamente pelo Vercel Cron (ver vercel.json). A Vercel manda
// automaticamente "Authorization: Bearer $CRON_SECRET" nas chamadas de cron quando
// essa env var está configurada — sem ela, a rota fica bloqueada (não dá pra deixar
// uma rota que mexe em comissão de Head aberta sem autenticação nenhuma).
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ success: false, error: 'CRON_SECRET não configurado' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Serviço não configurado' }, { status: 500 });
  }

  const cutoff = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Referência de inatividade é a última venda — ou, se o afiliado nunca vendeu
  // desde que entrou na carteira, a data em que entrou (head_joined_at). Sem isso,
  // um afiliado recém-atribuído e ainda sem venda nenhuma nunca seria liberado.
  const { data: candidates, error: fetchError } = await supabase
    .from('affiliates')
    .select('id, head_id, last_sale_at, head_joined_at')
    .not('head_id', 'is', null);

  if (fetchError) {
    console.error('[Cron release-inactive-heads] Error fetching candidates:', fetchError);
    return NextResponse.json({ success: false, error: 'Erro ao buscar afiliados' }, { status: 500 });
  }

  const toRelease = (candidates || []).filter((a) => {
    const reference = a.last_sale_at || a.head_joined_at;
    if (!reference) return false; // sem nenhuma referência de tempo, não mexe
    return new Date(reference).toISOString() < cutoff;
  });

  let released = 0;
  for (const affiliate of toRelease) {
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({ head_id: null })
      .eq('id', affiliate.id);

    if (updateError) {
      console.error(`[Cron release-inactive-heads] Error releasing affiliate ${affiliate.id}:`, updateError);
      continue;
    }

    await supabase.from('head_wallet_events').insert({
      head_id: affiliate.head_id,
      affiliate_id: affiliate.id,
      event: 'released_inactive',
    });

    released++;
  }

  console.log(`[Cron release-inactive-heads] ${released}/${toRelease.length} afiliado(s) liberado(s) por inatividade`);

  return NextResponse.json({ success: true, released, evaluated: candidates?.length || 0 });
}
