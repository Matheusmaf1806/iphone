'use client';

import { useEffect, useState } from 'react';
import Loader from '../Loader';

export default function PlatformConfigManager() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform-config');
      const data = await res.json();
      if (data.success) {
        setConfigs(data.data);
      }
    } catch (err) {
      console.error('Error loading platform config:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (config) => {
    setEditingKey(config.key);
    setEditValue(config.value);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const saveEdit = async (config) => {
    const numericValue = parseFloat(editValue.replace(',', '.'));
    if (isNaN(numericValue) || numericValue < 0) {
      alert('Digite um número válido');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/platform-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key: config.key, value: numericValue }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigs(prev => prev.map(c => (c.key === config.key ? { ...c, value: String(numericValue) } : c)));
        setEditingKey(null);
        setEditValue('');
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (err) {
      console.error('Error saving platform config:', err);
      alert('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-40"><Loader size="md" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Configurações</h1>
        <p className="text-gray-600">Valores globais usados no cálculo de preço em toda a loja</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
        {configs.map(config => (
          <div key={config.key} className="p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{config.label}</p>
              {config.help && <p className="text-sm text-gray-500 mt-0.5">{config.help}</p>}
              <p className="text-xs text-gray-400 font-mono mt-1">{config.key}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {editingKey === config.key ? (
                <>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(config);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="w-28 px-3 py-2 border border-blue-400 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <span className="text-gray-500 text-sm w-4">{config.suffix}</span>
                  <button
                    onClick={() => saveEdit(config)}
                    disabled={saving}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Salvar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Cancelar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <span className="text-lg font-bold text-gray-900">
                    {config.key === 'usd_brl_rate' ? `R$ ${parseFloat(config.value).toFixed(2)}` : `${parseFloat(config.value).toFixed(2)}${config.suffix}`}
                  </span>
                  <button
                    onClick={() => startEdit(config)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
