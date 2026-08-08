import { redirect } from 'next/navigation';
import { requireAuth } from '../../../../lib/auth';
import GestaoLayout from '../../../../components/gestao/GestaoLayout';
import UserManager from '../../../../components/shared/UserManager';

export const metadata = {
  title: 'Usuários - ERP',
};

export default async function AdminUsersPage() {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return (
    <GestaoLayout session={auth.session}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciar Administradores</h1>
        <p className="text-sm text-gray-500 mt-1">
          Adicione e gerencie os usuários com acesso ao painel de gestão ERP
        </p>
      </div>
      <UserManager
        apiUrl="/api/admin/users"
        roles={['admin', 'editor', 'viewer']}
        currentUserId={auth.session.id}
      />
    </GestaoLayout>
  );
}
