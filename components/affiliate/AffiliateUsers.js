'use client';

import AffiliateLayout from './AffiliateLayout';
import UserManager from '../shared/UserManager';

export default function AffiliateUsers({ session }) {
  return (
    <AffiliateLayout session={session}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciar Equipe</h1>
        <p className="text-sm text-gray-500 mt-1">
          Adicione e gerencie os membros da sua equipe que podem acessar o painel de afiliado
        </p>
      </div>
      <UserManager
        apiUrl="/api/affiliate/users"
        roles={['admin', 'editor', 'viewer']}
        currentUserId={session.userId}
      />
    </AffiliateLayout>
  );
}
