import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AffiliateCoupons from '../../../../components/affiliate/AffiliateCoupons';
import { supabase } from '../../../../lib/supabase/client';

export default async function CuponsPage() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('affiliate_session');

  if (!sessionCookie) {
    redirect('/afiliado/login');
  }

  let session;
  try {
    session = JSON.parse(sessionCookie.value);
  } catch {
    redirect('/afiliado/login');
  }

  // Buscar dados do afiliado
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id, name, commission_rate')
    .eq('id', session.affiliateId)
    .single();

  if (!affiliate) {
    redirect('/afiliado/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AffiliateCoupons
        affiliateId={affiliate.id}
        commissionRate={affiliate.commission_rate || 0}
      />
    </div>
  );
}
