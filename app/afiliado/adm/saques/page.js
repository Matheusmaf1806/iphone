import { redirect } from 'next/navigation';
import { requireAffiliateAuth } from '../../../../lib/affiliateAuth';
import AffiliateWithdrawals from '../../../../components/affiliate/AffiliateWithdrawals';

export default async function AffiliateWithdrawalsPage() {
  const auth = await requireAffiliateAuth();

  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return <AffiliateWithdrawals session={auth.session} />;
}
