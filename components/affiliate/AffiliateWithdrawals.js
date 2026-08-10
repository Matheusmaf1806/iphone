'use client';

import { useState, useEffect } from 'react';
import AffiliateLayout from './AffiliateLayout';
import Loader from '../Loader';

export default function AffiliateWithdrawals({ session }) {
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    pixKey: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [withdrawalsRes, statsRes] = await Promise.all([
        fetch('/api/affiliate/withdrawals'),
        fetch('/api/affiliate/stats'),
      ]);

      const withdrawalsData = await withdrawalsRes.json();
      const statsData = await statsRes.json();

      if (withdrawalsData.success) {
        setWithdrawals(withdrawalsData.data);
      }

      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      const amount = parseFloat(formData.amount);

      if (!amount || amount < 50) {
        setErrors({ amount: 'Valor mínimo para saque é R$ 50,00' });
        setSubmitting(false);
        return;
      }

      if (!formData.pixKey) {
        setErrors({ pixKey: 'Chave PIX é obrigatória' });
        setSubmitting(false);
        return;
      }

      const response = await fetch('/api/affiliate/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          pixKey: formData.pixKey,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowModal(false);
        setFormData({ amount: '', pixKey: '' });
        loadData(); // Recarregar dados
        alert('Solicitação de saque enviada com sucesso!');
      } else {
        setErrors({ general: data.error || 'Erro ao solicitar saque' });
      }
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      setErrors({ general: 'Erro ao processar solicitação' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pendente', icon: 'fa-clock' },
      processing: { color: 'bg-blue-100 text-blue-700', label: 'Processando', icon: 'fa-spinner' },
      paid: { color: 'bg-green-100 text-green-700', label: 'Pago', icon: 'fa-check-circle' },
      cancelled: { color: 'bg-red-100 text-red-700', label: 'Cancelado', icon: 'fa-times-circle' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        <i className={`fas ${badge.icon}`}></i>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <AffiliateLayout session={session}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      </AffiliateLayout>
    );
  }

  return (
    <AffiliateLayout session={session}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <i className="fas fa-money-bill-wave text-brand-yellow"></i>
            Meus Saques
          </h1>
          <p className="text-gray-600">
            Solicite saques das suas comissões e acompanhe o status
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-green-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-wallet text-green-600 text-xl"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  R$ {(stats?.availableBalance || 0).toFixed(2).replace('.', ',')}
                </p>
                <p className="text-sm text-gray-600">Saldo Disponível</p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              disabled={(stats?.availableBalance || 0) < 50}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-plus mr-2"></i>
              Solicitar Saque
            </button>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-clock text-yellow-600 text-xl"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {(stats?.pendingBalance || 0).toFixed(2).replace('.', ',')}
                </p>
                <p className="text-sm text-gray-600">Saldo Pendente</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-yellow bg-opacity-20 rounded-xl flex items-center justify-center">
                <i className="fas fa-coins text-brand-yellow text-xl"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {(stats?.totalCommission || 0).toFixed(2).replace('.', ',')}
                </p>
                <p className="text-sm text-gray-600">Total Ganho</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <i className="fas fa-info text-white text-xl"></i>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Informações sobre saques</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-blue-500 mt-0.5"></i>
                  <span>Valor mínimo para saque: <strong>R$ 50,00</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-blue-500 mt-0.5"></i>
                  <span>Processamento: até 5 dias úteis</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-blue-500 mt-0.5"></i>
                  <span>Saques são realizados via PIX</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Withdrawals History */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Histórico de Saques</h2>

          {withdrawals.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
              <p className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum saque solicitado
              </p>
              <p className="text-gray-600">
                Quando você solicitar um saque, ele aparecerá aqui
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="p-6 bg-gray-50 rounded-xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-2xl font-bold text-gray-900">
                          R$ {parseFloat(withdrawal.amount).toFixed(2).replace('.', ',')}
                        </p>
                        {getStatusBadge(withdrawal.status)}
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-600">
                          <i className="fas fa-calendar mr-2"></i>
                          Solicitado em: {new Date(withdrawal.requested_at).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-gray-600">
                          <i className="fas fa-key mr-2"></i>
                          Chave PIX: {withdrawal.pix_key}
                        </p>
                        {withdrawal.paid_at && (
                          <p className="text-green-600 font-semibold">
                            <i className="fas fa-check mr-2"></i>
                            Pago em: {new Date(withdrawal.paid_at).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Saque */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Solicitar Saque</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-10 h-10 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <i className="fas fa-times text-gray-600"></i>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {errors.general && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-700 text-sm">
                    {errors.general}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor do Saque *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-gray-500">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="50"
                      max={stats?.availableBalance || 0}
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className={`w-full pl-14 pr-4 py-3 border-2 ${
                        errors.amount ? 'border-red-500' : 'border-gray-200'
                      } rounded-xl focus:outline-none focus:border-brand-yellow transition-colors`}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
                  <p className="text-xs text-gray-600 mt-2">
                    Saldo disponível: R$ {(stats?.availableBalance || 0).toFixed(2).replace('.', ',')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chave PIX *
                  </label>
                  <input
                    type="text"
                    value={formData.pixKey}
                    onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                    className={`w-full px-4 py-3 border-2 ${
                      errors.pixKey ? 'border-red-500' : 'border-gray-200'
                    } rounded-xl focus:outline-none focus:border-brand-yellow transition-colors`}
                    placeholder="Digite sua chave PIX"
                    required
                  />
                  {errors.pixKey && <p className="text-red-500 text-xs mt-1">{errors.pixKey}</p>}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader size="xs" className="mr-2 inline-block" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check mr-2"></i>
                        Confirmar Saque
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AffiliateLayout>
  );
}
