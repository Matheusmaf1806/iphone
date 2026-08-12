'use client';

import { useState, useEffect } from 'react';

const STATUS_LABELS = { pending: 'Pendente', processing: 'Em processamento', paid: 'Pago', cancelled: 'Cancelado' };
const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function HeadWithdrawalsManager() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/head-withdrawals', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setWithdrawals(data.withdrawals || []);
    } catch (err) {
      console.error('Error fetching head withdrawals:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch('/api/head-withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        setWithdrawals((prev) => prev.map((w) => (w.id === id ? data.withdrawal : w)));
      }
    } catch (err) {
      console.error('Error updating withdrawal:', err);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Saques dos Heads</h2>
        <p className="text-sm text-gray-500 mt-1">Solicitações de saque das comissões de rede</p>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Carregando...</div>
        ) : withdrawals.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Nenhuma solicitação de saque</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Head</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Chave PIX</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Solicitado em</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {withdrawals.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{w.head?.name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{w.pix_key}</td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                    R$ {parseFloat(w.amount).toFixed(2).replace('.', ',')}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">{formatDate(w.requested_at)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[w.status]}`}>
                      {STATUS_LABELS[w.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <select
                      value={w.status}
                      onChange={(e) => updateStatus(w.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
