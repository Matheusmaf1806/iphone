import { redirect } from 'next/navigation';
import { requireHeadAuth } from '../../../../lib/headAuth';
import HeadWithdrawals from '../../../../components/head/HeadWithdrawals';

export default async function HeadSaquesPage() {
  const auth = await requireHeadAuth();
  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return <HeadWithdrawals session={auth.session} />;
}
