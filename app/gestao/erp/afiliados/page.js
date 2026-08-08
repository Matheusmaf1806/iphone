import { redirect } from 'next/navigation';
import { requireAuth } from '../../../../lib/auth';
import GestaoLayout from '../../../../components/gestao/GestaoLayout';
import AfiliadosManager from '../../../../components/gestao/AfiliadosManager';

export const metadata = {
  title: 'Gestão de Afiliados - ERP',
};

export default async function AfiliadosPage() {
  // Verificar autenticação
  const auth = await requireAuth();
  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return (
    <GestaoLayout session={auth.session}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestão de Afiliados
        </h1>
        <p className="text-gray-600">
          Gerencie afiliados e configure a identidade visual da loja
        </p>
      </div>

      <AfiliadosManager />
    </GestaoLayout>
  );
}
