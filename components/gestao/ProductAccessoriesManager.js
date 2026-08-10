'use client';
import { useState, useEffect } from 'react';
import Loader from '../Loader';

export default function ProductAccessoriesManager({ productId, productName, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [links, setLinks] = useState([]); // [{id, is_default_checked, display_order, accessory}]
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadLinks();
  }, [productId]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/product-accessories?productId=${productId}`);
      const data = await res.json();
      if (data.success) setLinks(data.data || []);
      else setError(data.error || 'Erro ao carregar acessórios');
    } catch (err) {
      setError('Erro ao carregar acessórios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(`/api/product-accessories?search=${encodeURIComponent(searchTerm.trim())}&excludeProductId=${productId}`);
        const data = await res.json();
        if (data.success) setSearchResults(data.data || []);
      } catch (err) {
        // silencioso — busca é auxiliar, não bloqueia o resto da tela
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, productId]);

  const alreadyLinkedIds = new Set(links.map(l => l.accessory?.id).filter(Boolean));

  const handleAdd = async (accessoryProductId) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/product-accessories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          accessoryProductId,
          isDefaultChecked: false,
          displayOrder: links.length,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSearchTerm('');
      setSearchResults([]);
      await loadLinks();
    } catch (err) {
      setError(err.message || 'Erro ao adicionar acessório');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDefault = async (link) => {
    setSaving(true);
    try {
      await fetch('/api/product-accessories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: link.id, isDefaultChecked: !link.is_default_checked }),
      });
      setLinks(prev => prev.map(l => (l.id === link.id ? { ...l, is_default_checked: !l.is_default_checked } : l)));
    } catch (err) {
      setError('Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (linkId) => {
    if (!confirm('Remover esse acessório da lista de compatíveis?')) return;
    setSaving(true);
    try {
      await fetch(`/api/product-accessories?id=${linkId}`, { method: 'DELETE' });
      setLinks(prev => prev.filter(l => l.id !== linkId));
    } catch (err) {
      setError('Erro ao remover');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Acessórios Compatíveis</h2>
              <p className="text-sm text-gray-500">{productName}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Produtos marcados aqui aparecem como checkbox de "Adicionar junto" na página deste produto —
            use pra ligar acessórios de verdade compatíveis (ex: Apple Pencil Pro pro iPad Pro, não pro iPad base).
          </p>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}

          {/* Buscar e adicionar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Adicionar acessório</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o nome do produto (ex: Apple Pencil Pro)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {searching && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
            {searchResults.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-lg divide-y max-h-56 overflow-y-auto">
                {searchResults.map(p => {
                  const isLinked = alreadyLinkedIds.has(p.id);
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-2.5">
                      {p.image_url && <img src={p.image_url} alt={p.name} className="w-8 h-8 object-contain flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.category}{!p.is_active && ' · inativo'}</p>
                      </div>
                      <button
                        type="button"
                        disabled={isLinked || saving}
                        onClick={() => handleAdd(p.id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {isLinked ? 'Já ligado' : '+ Adicionar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lista atual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Acessórios ligados a este produto {links.length > 0 && `(${links.length})`}
            </label>
            {loading ? (
              <div className="flex justify-center py-6"><Loader size="sm" /></div>
            ) : links.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Nenhum acessório compatível cadastrado ainda.</p>
            ) : (
              <div className="space-y-2">
                {links.map(link => (
                  <div key={link.id} className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg">
                    {link.accessory?.image_url && (
                      <img src={link.accessory.image_url} alt={link.accessory.name} className="w-9 h-9 object-contain flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{link.accessory?.name || 'Produto removido'}</p>
                      {link.accessory && !link.accessory.is_active && (
                        <p className="text-xs text-orange-600">Produto inativo — não vai aparecer até ser ativado</p>
                      )}
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={link.is_default_checked}
                        onChange={() => handleToggleDefault(link)}
                        disabled={saving}
                      />
                      Marcado por padrão
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemove(link.id)}
                      disabled={saving}
                      className="text-red-500 hover:text-red-700 text-sm flex-shrink-0"
                      title="Remover"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
