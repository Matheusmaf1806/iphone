import { redirect } from 'next/navigation';
import { requireAffiliateAuth } from '../../../../lib/affiliateAuth';
import AffiliateIdentityVisual from '../../../../components/affiliate/AffiliateIdentityVisual';

export default async function AffiliateIdentityVisualPage() {
  const auth = await requireAffiliateAuth();

  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return <AffiliateIdentityVisual session={auth.session} />;
}
