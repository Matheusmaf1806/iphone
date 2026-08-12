import { redirect } from 'next/navigation';
import { requireHeadAuth } from '../../../../lib/headAuth';
import HeadSales from '../../../../components/head/HeadSales';

export default async function HeadSalesPage() {
  const auth = await requireHeadAuth();
  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return <HeadSales session={auth.session} />;
}
