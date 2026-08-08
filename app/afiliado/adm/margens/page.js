import { redirect } from 'next/navigation';
import { requireAffiliateAuth } from '../../../../lib/affiliateAuth';
import AffiliateProductMargins from '../../../../components/affiliate/AffiliateProductMargins';

export default async function AffiliateMarginsPage() {
  const auth = await requireAffiliateAuth();

  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return <AffiliateProductMargins session={auth.session} />;
}
