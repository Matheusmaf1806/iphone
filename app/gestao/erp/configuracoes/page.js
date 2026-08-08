import { redirect } from 'next/navigation';
import { requireAuth } from '../../../../lib/auth';
import GestaoLayout from '../../../../components/gestao/GestaoLayout';
import PlatformConfigManager from '../../../../components/gestao/PlatformConfigManager';

export const metadata = {
  title: 'Configurações - ERP',
};

export default async function ConfiguracoesPage() {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return (
    <GestaoLayout session={auth.session}>
      <PlatformConfigManager />
    </GestaoLayout>
  );
}
