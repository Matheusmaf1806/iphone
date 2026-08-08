'use client';

import { useState, useEffect } from 'react';
import Loader from '../Loader';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    discount_percentage: '',
    affiliate_id: '',
    valid_until: '',
    usage_limit: '',
    min_order_value: ''
  });

  useEffect(() => {
    loadCoupons();
    loadAffiliates();
  }, []);

  const loadCoupons = async () => {
    try {
      const response = await fetch('/api/admin/coupons');
      const data = await response.json();

      if (response.ok) {
        setCoupons(data.coupons || []);
      } else {
        setError(data.error || 'Erro ao carregar cupons');
      }
    } catch (err) {
      setError('Erro ao carregar cupons');
    } finally {
      setLoading(false);
    }
  };

  const loadAffiliates = async () => {
    try {
      const response = await fetch('/api/affiliates');
      const data = await response.json();

      if (response.ok) {
        setAffiliates(data.affiliates || []);
      }
    } catch (err) {
      console.error('Erro ao carregar afiliados:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const url = '/api/admin/coupons';
      const method = editingCoupon ? 'PUT' : 'POST';

      const payload = editingCoupon
        ? { id: editingCoupon.id, ...formData }
        : formData;

      // Converter affiliate_id vazio para null
      if (payload.affiliate_id === '') {
        payload.affiliate_id = null;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(editingCoupon ? 'Cupom atualizado!' : 'Cupom criado!');
        setShowModal(false);
        setEditingCoupon(null);
        resetForm();
        loadCoupons();
      } else {
        setError(data.error || 'Erro ao salvar cupom');
      }
    } catch (err) {
      setError('Erro ao salvar cupom');
    }
  };

  const handleDelete = async (couponId) => {
    if (!confirm('Tem certeza que deseja deletar este cupom?')) return;

    try {
      const response = await fetch(`/api/admin/coupons?id=${couponId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('Cupom deletado!');
        loadCoupons();
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao deletar cupom');
      }
    } catch (err) {
      setError('Erro ao deletar cupom');
    }
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_percentage: coupon.discount_percentage,
      affiliate_id: coupon.affiliate_id || '',
      valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString().split('T')[0] : '',
      usage_limit: coupon.usage_limit || '',
      min_order_value: coupon.min_order_value || ''
    });
    setShowModal(true);
  };

  const handleToggleActive = async (coupon) => {
    try {
      const response = await fetch('/api/admin/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: coupon.id,
          is_active: !coupon.is_active
        })
      });

      if (response.ok) {
        setSuccess('Status atualizado!');
        loadCoupons();
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao atualizar status');
      }
    } catch (err) {
      setError('Erro ao atualizar status');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discount_percentage: '',
      affiliate_id: '',
      valid_until: '',
      usage_limit: '',
      min_order_value: ''
    });
  };

  const openCreateModal = () => {
    setEditingCoupon(null);
    resetForm();
    setShowModal(true);
  };

  if (loading) {
    return <div className="p-6 flex items-center justify-center h-64"><div className="text-center"><Loader size="lg" className="mx-auto mb-4" /><p className="text-gray-600">Carregando...</p></div></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Cupons de Desconto (Admin)</h2>
          <p className="text-gray-600 mt-1">
            Gerencie cupons de desconto da margem do admin
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Criar Cupom
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desconto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Afiliado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uso</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Validade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Desc.</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {coupons.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                  Nenhum cupom criado ainda
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono font-bold text-lg">{coupon.code}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {coupon.discount_percentage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {coupon.affiliate_name || 'Global'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {coupon.usage_count} {coupon.usage_limit ? `/ ${coupon.usage_limit}` : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {coupon.valid_until
                      ? new Date(coupon.valid_until).toLocaleDateString('pt-BR')
                      : 'Sem limite'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(coupon)}
                      className={`px-2 py-1 rounded text-xs ${
                        coupon.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {coupon.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    R$ {(coupon.total_discount_given || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(coupon)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              {editingCoupon ? 'Editar Cupom' : 'Criar Cupom'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código do Cupom *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-300 rounded px-3 py-2 font-mono"
                  placeholder="EX: DESCONTO10"
                  required
                  disabled={editingCoupon !== null}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desconto (%) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  O desconto é aplicado na margem do admin
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Afiliado (opcional)
                </label>
                <select
                  value={formData.affiliate_id}
                  onChange={(e) => setFormData({ ...formData, affiliate_id: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Global (todos os afiliados)</option>
                  {affiliates.map((affiliate) => (
                    <option key={affiliate.id} value={affiliate.id}>
                      {affiliate.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Deixe em branco para cupom global
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Válido até
                </label>
                <input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Limite de uso
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Ilimitado"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor mínimo do pedido (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.min_order_value}
                  onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCoupon(null);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  {editingCoupon ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
