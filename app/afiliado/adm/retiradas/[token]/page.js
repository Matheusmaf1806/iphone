import { redirect } from 'next/navigation';
import { requireAffiliateAuth } from '../../../../../lib/affiliateAuth';
import PickupConfirm from '../../../../../components/affiliate/PickupConfirm';

export default async function AffiliatePickupTokenPage({ params }) {
  const auth = await requireAffiliateAuth();

  if (!auth.authenticated) {
    redirect(`/afiliado/login?redirect=${encodeURIComponent(`/afiliado/adm/retiradas/${params.token}`)}`);
  }

  return <PickupConfirm session={auth.session} token={params.token} />;
}
