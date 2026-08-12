import { NextResponse } from 'next/server';
import { getHeadSession } from '../../../../lib/headAuth';
import { createServerClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const INACTIVITY_DAYS = 90;

export async function GET() {
  const session = getHeadSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Serviço não configurado' }, { status: 500 });
  }

  const [{ data: affiliates }, { data: orders }, { data: events }] = await Promise.all([
    supabase
      .from('affiliates')
      .select('id, name, slug, is_active, last_sale_at, head_joined_at')
      .eq('head_id', session.headId)
      .order('name'),
    supabase
      .from('orders')
      .select('affiliate_id, head_commission_amount, payment_status')
      .eq('head_id', session.headId)
      .eq('payment_status', 'paid'),
    supabase
      .from('head_wallet_events')
      .select('id, affiliate_id, event, created_at, affiliate:affiliates(name)')
      .eq('head_id', session.headId)
      .eq('event', 'released_inactive')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const earningsByAffiliate = {};
  let totalEarnings = 0;
  for (const order of orders || []) {
    const amount = parseFloat(order.head_commission_amount) || 0;
    earningsByAffiliate[order.affiliate_id] = (earningsByAffiliate[order.affiliate_id] || 0) + amount;
    totalEarnings += amount;
  }

  const now = Date.now();
  const wallet = (affiliates || []).map((aff) => {
    const reference = aff.last_sale_at || aff.head_joined_at;
    const daysSinceSale = reference ? Math.floor((now - new Date(reference).getTime()) / (24 * 60 * 60 * 1000)) : null;
    return {
      id: aff.id,
      name: aff.name,
      slug: aff.slug,
      isActive: aff.is_active,
      daysSinceSale,
      daysUntilRelease: daysSinceSale != null ? Math.max(INACTIVITY_DAYS - daysSinceSale, 0) : null,
      atRisk: daysSinceSale != null && daysSinceSale >= INACTIVITY_DAYS - 15,
      earnings: parseFloat((earningsByAffiliate[aff.id] || 0).toFixed(2)),
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      wallet,
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      recentReleases: (events || []).map((e) => ({
        affiliateName: e.affiliate?.name || 'Afiliado removido',
        releasedAt: e.created_at,
      })),
    },
  });
}
