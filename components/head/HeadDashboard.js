'use client';

import { useEffect, useState } from 'react';
import HeadLayout from './HeadLayout';
import Loader from '../Loader';

const INITIAL_FORM = {
  name: '', slug: '', commission_rate: '10',
  user_full_name: '', user_email: '', user_username: '', user_password: '',
};

export default function HeadDashboard({ session }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({ ...INITIAL_FORM });

  const loadNetwork = () => {
    fetch('/api/head/network')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setData(result.data);
      })
      .catch((err) => console.error('Error loading network:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNetwork();
  }, []);

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
    setFormError('');

    if (!formData.name || !formData.slug) {
      setFormError('Nome e slug do afiliado são obrigatórios');
      return;
    }
    if (!formData.user_full_name || !formData.user_email || !formData.user_username || !formData.user_password) {
      setFormError('Todos os campos do primeiro usuário são obrigatórios');
      return;
    }
    if (formData.user_password.length < 6) {
      setFormError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/head/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.success) {
        setShowForm(false);
        setFormData({ ...INITIAL_FORM });
        setLoading(true);
        loadNetwork();
      } else {
        setFormError(result.error || 'Erro ao criar afiliado');
      }
    } catch (err) {
      setFormError('Erro ao conectar com o servidor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <HeadLayout session={session}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minha Rede</h1>
          <p className="text-gray-600 text-sm mt-1">
            Você ganha {session.commissionPercentage}% da margem da iShop em toda venda dos afiliados abaixo.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormError(''); }}
          className="flex-shrink-0 bg-indigo-700 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-800 transition-colors font-medium text-sm"
        >
          {showForm ? 'Cancelar' : '+ Novo Afiliado'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Novo afiliado (já entra na sua carteira)</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{formError}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Loja do João"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                <input
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comissão do afiliado</label>
                <select
                  name="commission_rate"
                  value={formData.commission_rate}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="5">5%</option>
                  <option value="8">8%</option>
                  <option value="10">10%</option>
                  <option value="12">12%</option>
                  <option value="15">15%</option>
                </select>
              </div>
            </div>

            <p className="text-xs text-gray-400">Login do afiliado (dono da loja)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                <input
                  name="user_full_name"
                  value={formData.user_full_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  name="user_email"
                  type="email"
                  value={formData.user_email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuário *</label>
                <input
                  name="user_username"
                  value={formData.user_username}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
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
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-700 text-white px-8 py-2.5 rounded-lg hover:bg-indigo-800 transition-colors font-medium text-sm disabled:opacity-50"
              >
                {saving ? 'Criando...' : 'Criar Afiliado'}
              </button>
            </div>
          </form>
        </div>
      )}

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
