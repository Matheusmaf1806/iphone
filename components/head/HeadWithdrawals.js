'use client';

import { useEffect, useState } from 'react';
import HeadLayout from './HeadLayout';
import Loader from '../Loader';

const STATUS_LABELS = { pending: 'Pendente', processing: 'Em processamento', paid: 'Pago', cancelled: 'Cancelado' };
const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function HeadWithdrawals({ session }) {
  const [withdrawals, setWithdrawals] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/head/withdrawals');
      const data = await res.json();
      if (data.success) {
        setWithdrawals(data.data);
        setBalance(data.availableBalance);
      }
    } catch (err) {
      console.error('Error loading withdrawals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const value = parseFloat(amount);
    if (!value || value < 50) {
      setError('Valor mínimo para saque é R$ 50,00');
      return;
    }
    if (!pixKey.trim()) {
      setError('Informe uma chave PIX');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/head/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: value, pixKey: pixKey.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Solicitação de saque enviada!');
        setAmount('');
        setPixKey('');
        load();
      } else {
        setError(data.error || 'Erro ao solicitar saque');
      }
    } catch (err) {
      setError('Erro ao solicitar saque');
    } finally {
      setSaving(false);
    }
  };

  return (
    <HeadLayout session={session}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Saques</h1>
        <p className="text-gray-600 text-sm mt-1">Solicite o saque das suas comissões de rede</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader size="md" /></div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <p className="text-sm text-gray-500 mb-1">Saldo disponível</p>
            <p className="text-3xl font-bold text-gray-900 mb-4">R$ {balance.toFixed(2).replace('.', ',')}</p>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-3">{error}</div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm mb-3">{success}</div>}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Valor (mín. R$ 50)</label>
                <input
                  type="number"
                  min="50"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="R$ 0,00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Chave PIX</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="CPF, email, telefone..."
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-indigo-700 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-800 transition-colors disabled:opacity-50 text-sm"
                >
                  {saving ? 'Enviando...' : 'Solicitar Saque'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-md divide-y divide-gray-100">
            {withdrawals.length === 0 ? (
              <p className="p-8 text-center text-gray-500 text-sm">Nenhuma solicitação ainda.</p>
            ) : (
              withdrawals.map((w) => (
                <div key={w.id} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">R$ {parseFloat(w.amount).toFixed(2).replace('.', ',')}</p>
                    <p className="text-xs text-gray-500">{new Date(w.requested_at).toLocaleDateString('pt-BR')} · {w.pix_key}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[w.status]}`}>
                    {STATUS_LABELS[w.status]}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </HeadLayout>
  );
}
