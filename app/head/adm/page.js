import { redirect } from 'next/navigation';
import { requireHeadAuth } from '../../../lib/headAuth';
import HeadDashboard from '../../../components/head/HeadDashboard';

export default async function HeadAdmPage() {
  const auth = await requireHeadAuth();
  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return <HeadDashboard session={auth.session} />;
}
