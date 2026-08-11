import { redirect } from 'next/navigation';
import { requireAffiliateAuth } from '../../../../lib/affiliateAuth';
import PickupSearch from '../../../../components/affiliate/PickupSearch';

export default async function AffiliatePickupPage() {
  const auth = await requireAffiliateAuth();

  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return <PickupSearch session={auth.session} />;
}
