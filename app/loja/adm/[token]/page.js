import { redirect } from 'next/navigation';
import { requireStoreAuth } from '../../../../lib/storeAuth';
import StoreConfirm from '../../../../components/store/StoreConfirm';

export default async function StoreTokenPage({ params }) {
  const auth = await requireStoreAuth();

  if (!auth.authenticated) {
    redirect(`/loja/login?redirect=${encodeURIComponent(`/loja/adm/${params.token}`)}`);
  }

  return <StoreConfirm session={auth.session} token={params.token} />;
}
