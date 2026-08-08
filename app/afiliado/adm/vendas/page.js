import { redirect } from 'next/navigation';
import { requireAffiliateAuth } from '../../../../lib/affiliateAuth';
import AffiliateSales from '../../../../components/affiliate/AffiliateSales';

export default async function AffiliateSalesPage() {
  const auth = await requireAffiliateAuth();

  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return <AffiliateSales session={auth.session} />;
}
