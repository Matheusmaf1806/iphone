import { redirect } from 'next/navigation';
import { requireAffiliateAuth } from '../../../../lib/affiliateAuth';
import AffiliateProducts from '../../../../components/affiliate/AffiliateProducts';

export default async function AffiliateProductsPage() {
  const auth = await requireAffiliateAuth();

  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return <AffiliateProducts session={auth.session} />;
}
