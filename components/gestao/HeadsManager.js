'use client';

import { useState, useEffect } from 'react';

const INITIAL_FORM = {
  name: '',
  slug: '',
  own_affiliate_id: '',
  commission_percentage: '25',
  user_full_name: '',
  user_email: '',
  user_username: '',
  user_password: '',
};

export default function HeadsManager() {
  const [heads, setHeads] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ ...INITIAL_FORM });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [headsRes, affiliatesRes] = await Promise.all([
        fetch('/api/heads', { credentials: 'include' }),
        fetch('/api/affiliates', { credentials: 'include' }),
      ]);
      const headsData = await headsRes.json();
      const affiliatesData = await affiliatesRes.json();
      if (headsData.success) setHeads(headsData.heads || []);
      if (affiliatesData.success) setAffiliates(affiliatesData.affiliates || []);
    } catch (err) {
      console.error('Error fetching heads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'name' && !formData.slug) {
      const slug = value
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData((prev) => ({ ...prev, slug }));
    }
    if (name === 'user_email' && !formData.user_username) {
      const username = value.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
      setFormData((prev) => ({ ...prev, user_username: username }));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name) {
      setError('Nome do Head é obrigatório');
      return;
    }
    if (!formData.user_full_name || !formData.user_username || !formData.user_password) {
      setError('Todos os campos do primeiro usuário são obrigatórios');
      return;
    }
    if (formData.user_password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/heads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setFormData({ ...INITIAL_FORM });
        loadAll();
      } else {
        setError(data.error || 'Erro ao criar Head');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (head) => {
    try {
      const res = await fetch('/api/heads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: head.id, is_active: !head.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        setHeads((prev) => prev.map((h) => (h.id === head.id ? { ...h, is_active: !h.is_active } : h)));
      }
    } catch (err) {
      console.error('Error toggling head:', err);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Heads (donos de rede)</h2>
          <p className="text-sm text-gray-500 mt-1">
            Ganham uma fatia recorrente da margem da iShop em toda venda dos afiliados da carteira deles.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); }}
          className="bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm flex items-center gap-2"
        >
          {showForm ? 'Cancelar' : '+ Novo Head'}
        </button>
      </div>

      {showForm && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <form onSubmit={handleCreate} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="font-semibold text-gray-900">Dados do Head</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Rede João Vendas"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">% sobre a margem da iShop</label>
                  <input
                    name="commission_percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.commission_percentage}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Também vende? (opcional)</label>
                  <select
                    name="own_affiliate_id"
                    value={formData.own_affiliate_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                  >
                    <option value="">Não, só gerencia a rede</option>
                    {affiliates.map((aff) => (
                      <option key={aff.id} value={aff.id}>{aff.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Vincula a uma loja de afiliado já cadastrada</p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">2</span>
                <h3 className="font-semibold text-gray-900">Primeiro Usuário (login em /head)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                  <input
                    name="user_full_name"
                    value={formData.user_full_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    name="user_email"
                    type="email"
                    value={formData.user_email}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuário *</label>
                  <input
                    name="user_username"
                    value={formData.user_username}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                  <input
                    name="user_password"
                    type="password"
                    value={formData.user_password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="bg-gray-900 text-white px-8 py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm disabled:opacity-50"
              >
                {saving ? 'Criando...' : 'Criar Head'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Carregando...</div>
        ) : heads.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Nenhum Head cadastrado</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Head</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Também vende</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">% Comissão</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {heads.map((head) => (
                <tr key={head.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 text-sm">{head.name}</p>
                    {head.slug && <p className="text-xs text-gray-400 font-mono">{head.slug}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{head.own_affiliate?.name || '—'}</td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700">{head.commission_percentage}%</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      head.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {head.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleActive(head)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        head.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {head.is_active ? 'Desativar' : 'Ativar'}
                    </button>
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
