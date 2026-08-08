'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AffiliateLayout from './AffiliateLayout';
import Loader from '../Loader';

export default function AffiliateDashboard({ session }) {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/affiliate/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AffiliateLayout session={session}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Carregando dashboard...</p>
          </div>
        </div>
      </AffiliateLayout>
    );
  }

  // Se não tiver dados, mostrar mensagem de erro
  if (!stats) {
    return (
      <AffiliateLayout session={session}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <i className="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
            <p className="text-gray-600 mb-4">Não foi possível carregar as estatísticas.</p>
            <button
              onClick={loadStats}
              className="px-4 py-2 bg-brand-yellow text-gray-900 rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </AffiliateLayout>
    );
  }

  return (
    <AffiliateLayout session={session}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-yellow to-yellow-400 rounded-2xl p-6 md:p-8 text-gray-900">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Olá, {session.fullName}! 👋
          </h1>
          <p className="text-gray-800">
            Bem-vindo ao seu painel de afiliado. Aqui você pode acompanhar suas vendas e comissões.
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total de Vendas */}
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-shopping-cart text-blue-600 text-xl"></i>
              </div>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                Total
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{stats.totalSales}</p>
            <p className="text-sm text-gray-600">Vendas Realizadas</p>
          </div>

          {/* Faturamento Total */}
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-dollar-sign text-green-600 text-xl"></i>
              </div>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                Total
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              R$ {stats.totalRevenue.toFixed(2).replace('.', ',')}
            </p>
            <p className="text-sm text-gray-600">Faturamento Gerado</p>
          </div>

          {/* Comissão Total */}
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-brand-yellow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-coins text-brand-yellow text-xl"></i>
              </div>
              <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-lg">
                Ganhos
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              R$ {stats.totalCommission.toFixed(2).replace('.', ',')}
            </p>
            <p className="text-sm text-gray-600">Comissão Total</p>
          </div>

          {/* Saldo Disponível */}
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-wallet text-purple-600 text-xl"></i>
              </div>
              <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-lg">
                Disponível
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              R$ {stats.availableBalance.toFixed(2).replace('.', ',')}
            </p>
            <p className="text-sm text-gray-600">Para Saque</p>
          </div>
        </div>

        {/* Performance do Mês */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <i className="fas fa-calendar-alt text-brand-yellow"></i>
              Performance do Mês
            </h2>
            <span className="text-sm text-gray-600">Dezembro 2023</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-3xl font-bold text-gray-900 mb-2">{stats.monthSales}</p>
              <p className="text-sm text-gray-600">Vendas no Mês</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-3xl font-bold text-gray-900 mb-2">
                R$ {stats.monthRevenue.toFixed(2).replace('.', ',')}
              </p>
              <p className="text-sm text-gray-600">Faturamento do Mês</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-xl">
              <p className="text-3xl font-bold text-brand-yellow mb-2">
                R$ {stats.monthCommission.toFixed(2).replace('.', ',')}
              </p>
              <p className="text-sm text-gray-600">Comissão do Mês</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Produtos Mais Vendidos */}
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <i className="fas fa-trophy text-brand-yellow"></i>
              Top Produtos
            </h2>

            <div className="space-y-4">
              {stats.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand-yellow bg-opacity-20 rounded-lg flex items-center justify-center font-bold text-brand-yellow">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.sales} vendas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-brand-yellow">
                      R$ {product.commission.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-xs text-gray-600">comissão</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vendas Recentes */}
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <i className="fas fa-clock text-brand-yellow"></i>
              Vendas Recentes
            </h2>

            <div className="space-y-4">
              {stats.recentSales.map((sale) => (
                <div key={sale.id} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{sale.id}</p>
                      <p className="text-sm text-gray-600">{sale.customer}</p>
                    </div>
                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-lg">
                      Pago
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {new Date(sale.date).toLocaleDateString('pt-BR')}
                    </span>
                    <div className="text-right">
                      <p className="text-gray-600">
                        Total: R$ {sale.total.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="font-bold text-brand-yellow">
                        Comissão: R$ {sale.commission.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => router.push('/afiliado/adm/vendas')}
                className="w-full py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Ver Todas as Vendas
              </button>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/afiliado/adm/produtos')}
            className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all text-left group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <i className="fas fa-box text-blue-600 text-xl"></i>
            </div>
            <p className="font-bold text-gray-900 mb-1">Ver Produtos</p>
            <p className="text-sm text-gray-600">Produtos disponíveis para venda</p>
          </button>

          <button
            onClick={() => router.push('/afiliado/adm/saques')}
            className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all text-left group"
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <i className="fas fa-money-bill-wave text-green-600 text-xl"></i>
            </div>
            <p className="font-bold text-gray-900 mb-1">Solicitar Saque</p>
            <p className="text-sm text-gray-600">Resgatar suas comissões</p>
          </button>

          <button
            onClick={() => router.push('/afiliado/adm/configuracoes')}
            className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all text-left group"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <i className="fas fa-cog text-purple-600 text-xl"></i>
            </div>
            <p className="font-bold text-gray-900 mb-1">Configurações</p>
            <p className="text-sm text-gray-600">Ajustar margem e dados</p>
          </button>
        </div>
      </div>
    </AffiliateLayout>
  );
}
