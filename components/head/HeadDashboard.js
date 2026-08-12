'use client';

import { useEffect, useState } from 'react';
import HeadLayout from './HeadLayout';
import Loader from '../Loader';

export default function HeadDashboard({ session }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/head/network')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setData(result.data);
      })
      .catch((err) => console.error('Error loading network:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <HeadLayout session={session}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Minha Rede</h1>
        <p className="text-gray-600 text-sm mt-1">
          Você ganha {session.commissionPercentage}% da margem da iShop em toda venda dos afiliados abaixo.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader size="md" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-2xl shadow-md p-6">
              <p className="text-sm text-gray-500 mb-1">Ganhos totais (pedidos pagos)</p>
              <p className="text-3xl font-bold text-gray-900">
                R$ {(data?.totalEarnings || 0).toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-md p-6">
              <p className="text-sm text-gray-500 mb-1">Afiliados na carteira</p>
              <p className="text-3xl font-bold text-gray-900">{data?.wallet?.length || 0}</p>
            </div>
          </div>

          {data?.recentReleases?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-amber-800 mb-2">
                <i className="fas fa-exclamation-triangle mr-1"></i>
                Saíram da sua carteira por inatividade
              </p>
              <ul className="space-y-1">
                {data.recentReleases.map((r, idx) => (
                  <li key={idx} className="text-xs text-amber-700">
                    {r.affiliateName} — {new Date(r.releasedAt).toLocaleDateString('pt-BR')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Afiliados da carteira</h2>
            </div>
            {data?.wallet?.length === 0 ? (
              <p className="p-8 text-center text-gray-500 text-sm">Nenhum afiliado atribuído a você ainda.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {data?.wallet?.map((aff) => (
                  <div key={aff.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{aff.name}</p>
                      <p className="text-xs text-gray-500">
                        {aff.daysSinceSale == null
                          ? 'Sem vendas registradas ainda'
                          : `Última venda há ${aff.daysSinceSale} dia(s)`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900 text-sm">
                        R$ {aff.earnings.toFixed(2).replace('.', ',')}
                      </p>
                      {aff.atRisk && (
                        <p className="text-[11px] font-semibold text-amber-600">
                          sai em {aff.daysUntilRelease} dia(s)
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </HeadLayout>
  );
}
