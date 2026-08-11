'use client';

import { useEffect, useState } from 'react';
import Loader from '../Loader';

const EMPTY_FORM = { id: null, name: '', address: '', city: 'Orlando', state: 'FL', zip_code: '', notes: '', is_active: true };

export default function PickupLocationsManager() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null); // null = fechado; EMPTY_FORM ou local existente = aberto
  const [error, setError] = useState('');

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pickup-locations?all=true', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setLocations(data.data);
      }
    } catch (err) {
      console.error('Error loading pickup locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setError('');
    setForm({ ...EMPTY_FORM, display_order: locations.length });
  };

  const openEdit = (loc) => {
    setError('');
    setForm({ ...loc });
  };

  const closeForm = () => {
    setForm(null);
    setError('');
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const isEdit = !!form.id;
      const res = await fetch('/api/pickup-locations', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        closeForm();
        loadLocations();
      } else {
        setError(data.error || 'Erro ao salvar local');
      }
    } catch (err) {
      console.error('Error saving pickup location:', err);
      setError('Erro ao salvar local');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (loc) => {
    try {
      const res = await fetch('/api/pickup-locations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: loc.id, is_active: !loc.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        setLocations((prev) => prev.map((l) => (l.id === loc.id ? data.data : l)));
      }
    } catch (err) {
      console.error('Error toggling pickup location:', err);
    }
  };

  const handleDelete = async (loc) => {
    if (!confirm(`Excluir "${loc.name}"?`)) return;
    try {
      const res = await fetch(`/api/pickup-locations?id=${loc.id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        if (data.message) alert(data.message);
        loadLocations();
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (err) {
      console.error('Error deleting pickup location:', err);
      alert('Erro ao excluir local');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-40"><Loader size="md" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Locais de retirada</h2>
          <p className="text-gray-600 text-sm">
            Opções que aparecem no checkout na hora de escolher onde retirar o pedido. Endereço e CEP são só informativos (não geram frete).
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Novo local
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
        {locations.length === 0 && (
          <p className="p-6 text-center text-gray-500 text-sm">Nenhum local cadastrado ainda.</p>
        )}
        {locations.map((loc) => (
          <div key={loc.id} className={`p-4 flex items-center justify-between gap-4 ${!loc.is_active ? 'opacity-50' : ''}`}>
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{loc.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {[loc.address, loc.city, loc.state, loc.zip_code].filter(Boolean).join(', ') || 'Endereço não preenchido'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${loc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {loc.is_active ? 'Ativo' : 'Inativo'}
              </span>
              <button onClick={() => toggleActive(loc)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title={loc.is_active ? 'Desativar' : 'Ativar'}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {loc.is_active ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  )}
                </svg>
              </button>
              <button onClick={() => openEdit(loc)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={() => handleDelete(loc)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {form && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{form.id ? 'Editar local' : 'Novo local'}</h3>

            {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: International Drive, Orlando"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Endereço</label>
                <input
                  type="text"
                  value={form.address || ''}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Rua, número"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={form.city || ''}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                  <input
                    type="text"
                    value={form.state || ''}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CEP/ZIP</label>
                  <input
                    type="text"
                    value={form.zip_code || ''}
                    onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observações (aparece pro cliente)</label>
                <textarea
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_active !== false}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Ativo (aparece no checkout)
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeForm} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
