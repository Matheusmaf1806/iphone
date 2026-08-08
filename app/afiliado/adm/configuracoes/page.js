import { redirect } from 'next/navigation';
import { requireAffiliateAuth } from '../../../../lib/affiliateAuth';
import AffiliateSettings from '../../../../components/affiliate/AffiliateSettings';

export default async function AffiliateSettingsPage() {
  const auth = await requireAffiliateAuth();

  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return <AffiliateSettings session={auth.session} />;
}
