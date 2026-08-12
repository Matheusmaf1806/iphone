import { redirect } from 'next/navigation';
import { requireAuth } from '../../../../lib/auth';
import GestaoLayout from '../../../../components/gestao/GestaoLayout';
import HeadsManager from '../../../../components/gestao/HeadsManager';
import HeadWithdrawalsManager from '../../../../components/gestao/HeadWithdrawalsManager';

export const metadata = {
  title: 'Rede de Heads - ERP',
};

export default async function RedePage() {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return (
    <GestaoLayout session={auth.session}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Rede de Heads</h1>
        <p className="text-gray-600">
          Heads ganham uma fatia recorrente da margem da iShop em toda venda dos afiliados da carteira
          deles. Atribua/troque o Head de cada afiliado na tela de Afiliados.
        </p>
      </div>

      <div className="space-y-8">
        <HeadsManager />
        <HeadWithdrawalsManager />
      </div>
    </GestaoLayout>
  );
}
