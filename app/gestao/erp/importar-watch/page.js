import { redirect } from 'next/navigation';
import { requireAuth } from '../../../../lib/auth';
import GestaoLayout from '../../../../components/gestao/GestaoLayout';
import AppleWatchZipImporter from '../../../../components/gestao/AppleWatchZipImporter';

export const metadata = {
  title: 'Importar Apple Watch - ERP',
};

export default async function ImportarWatchPage() {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return (
    <GestaoLayout session={auth.session}>
      <AppleWatchZipImporter />
    </GestaoLayout>
  );
}
