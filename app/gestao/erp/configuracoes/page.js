import { redirect } from 'next/navigation';
import { requireAuth } from '../../../../lib/auth';
import GestaoLayout from '../../../../components/gestao/GestaoLayout';
import PlatformConfigManager from '../../../../components/gestao/PlatformConfigManager';
import InstallmentFeesManager from '../../../../components/gestao/InstallmentFeesManager';

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
      <div className="space-y-10">
        <PlatformConfigManager />
        <InstallmentFeesManager />
      </div>
    </GestaoLayout>
  );
}
