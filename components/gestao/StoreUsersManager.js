'use client';

import { useEffect, useState } from 'react';

const EMPTY_FORM = { username: '', email: '', full_name: '', phone: '', password: '', pickup_location_id: '' };

export default function StoreUsersManager() {
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchAll = async () => {
    try {
      const [usersRes, locationsRes] = await Promise.all([
        fetch('/api/store-users'),
        fetch('/api/pickup-locations?all=true'),
      ]);
      const usersData = await usersRes.json();
      const locationsData = await locationsRes.json();
      if (usersData.users) setUsers(usersData.users);
      if (locationsData.success) setLocations(locationsData.data);
    } catch (err) {
      console.error('Error fetching store users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/store-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao criar usuário');
        return;
      }

      setSuccess('Usuário do balcão criado com sucesso!');
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchAll();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (userId, currentActive) => {
    try {
      const res = await fetch('/api/store-users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, is_active: !currentActive }),
      });
      if (res.ok) {
        fetchAll();
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao atualizar');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('Erro de conexão');
    }
  };

  const changeLocation = async (userId, pickupLocationId) => {
    try {
      const res = await fetch('/api/store-users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pickup_location_id: pickupLocationId }),
      });
      if (res.ok) {
        fetchAll();
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao atualizar');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('Erro de conexão');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Usuários da loja (balcão de retirada)</h2>
          <p className="text-gray-600 text-sm">
            Login separado, usado só em <code className="bg-gray-100 px-1 rounded">/loja</code> pra confirmar a
            entrega dos aparelhos. Sem local atribuído = pode confirmar retirada de qualquer local.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`}></i>
          {showForm ? 'Cancelar' : 'Novo usuário'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <i className="fas fa-check-circle"></i>
          {success}
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Novo usuário do balcão</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="João Silva"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="joaosilva"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="joao@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Local de retirada</label>
              <select
                value={form.pickup_location_id}
                onChange={(e) => setForm({ ...form, pickup_location_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">Todos os locais</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {saving ? 'Criando...' : 'Criar usuário'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <i className="fas fa-spinner fa-spin text-2xl text-gray-400 mb-3"></i>
          <p className="text-gray-500 text-sm">Carregando...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <i className="fas fa-store text-4xl text-gray-300 mb-3"></i>
          <p className="text-gray-500">Nenhum usuário do balcão cadastrado</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {users.map((user) => (
            <div key={user.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${!user.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center font-semibold text-gray-600 text-sm flex-shrink-0">
                  {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">@{user.username} · último login: {formatDate(user.last_login)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={user.pickup_location_id || ''}
                  onChange={(e) => changeLocation(user.id, e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Todos os locais</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => toggleActive(user.id, user.is_active)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    user.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                  }`}
                >
                  {user.is_active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
