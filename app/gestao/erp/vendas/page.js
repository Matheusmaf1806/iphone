import { redirect } from 'next/navigation';
import { requireAuth } from '../../../../lib/auth';
import GestaoLayout from '../../../../components/gestao/GestaoLayout';

export const metadata = {
  title: 'Gestão de Vendas - ERP',
};

export default async function VendasPage() {
  // Verificar autenticação
  const auth = await requireAuth();
  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  return (
    <GestaoLayout session={auth.session}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestão de Vendas
        </h1>
        <p className="text-gray-600">
          Gerencie suas vendas, pedidos e faturamento
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card de Vendas do Dia */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Vendas do Dia</h3>
            <p className="text-3xl font-bold">R$ 0,00</p>
            <p className="text-sm mt-2 opacity-90">0 pedidos</p>
          </div>

          {/* Card de Vendas do Mês */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Vendas do Mês</h3>
            <p className="text-3xl font-bold">R$ 0,00</p>
            <p className="text-sm mt-2 opacity-90">0 pedidos</p>
          </div>

          {/* Card de Ticket Médio */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Ticket Médio</h3>
            <p className="text-3xl font-bold">R$ 0,00</p>
            <p className="text-sm mt-2 opacity-90">Últimos 30 dias</p>
          </div>
        </div>

        {/* Tabela de Vendas Recentes */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Vendas Recentes</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    Nenhuma venda registrada
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </GestaoLayout>
  );
}
