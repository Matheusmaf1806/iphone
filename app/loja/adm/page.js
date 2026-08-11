import { redirect } from 'next/navigation';
import { requireStoreAuth } from '../../../lib/storeAuth';
import StoreSearch from '../../../components/store/StoreSearch';

export default async function StoreAdmPage() {
  const auth = await requireStoreAuth();

  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return <StoreSearch session={auth.session} />;
}
