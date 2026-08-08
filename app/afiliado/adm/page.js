import { redirect } from 'next/navigation';
import { requireAffiliateAuth } from '../../../lib/affiliateAuth';
import AffiliateDashboard from '../../../components/affiliate/AffiliateDashboard';

export default async function AffiliateAdminPage() {
  const auth = await requireAffiliateAuth();

  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return <AffiliateDashboard session={auth.session} />;
}
