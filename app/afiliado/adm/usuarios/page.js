import { redirect } from 'next/navigation';
import { requireAffiliateAuth } from '../../../../lib/affiliateAuth';
import AffiliateUsersPage from '../../../../components/affiliate/AffiliateUsers';

export default async function UsersPage() {
  const auth = await requireAffiliateAuth();

  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return <AffiliateUsersPage session={auth.session} />;
}
