'use client';

import { useState, useEffect } from 'react';

export default function DuplicatesModal({ onClose, onDeleted }) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [totalDuplicates, setTotalDuplicates] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadDuplicates();
  }, []);

  const loadDuplicates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products/duplicates', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setGroups(data.groups);
        setTotalDuplicates(data.totalDuplicates);
        // Auto-select all duplicates except the first (oldest) in each group
        const autoSelected = new Set();
        for (const group of data.groups) {
          // Keep the first created (oldest), delete the rest
          const sorted = [...group].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          sorted.slice(1).forEach(p => autoSelected.add(p.id));
        }
        setSelectedIds(autoSelected);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao carregar duplicados' });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllDuplicates = () => {
    const allDups = new Set();
    for (const group of groups) {
      const sorted = [...group].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      sorted.slice(1).forEach(p => allDups.add(p.id));
    }
    setSelectedIds(allDups);
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Deseja excluir ${selectedIds.size} produto(s) duplicado(s)? Esta ação não pode ser desfeita.`)) return;

    setDeleting(true);
    try {
      const res = await fetch('/api/products/duplicates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `${data.deleted} produto(s) excluído(s) com sucesso!` });
        await loadDuplicates();
        if (onDeleted) onDeleted();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao excluir' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Produtos Duplicados</h2>
            <p className="text-sm text-gray-600 mt-1">
              {loading ? 'Carregando...' : `${groups.length} grupo(s) com ${totalDuplicates} duplicata(s)`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-500">Analisando produtos...</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-green-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-700 font-semibold">Nenhum produto duplicado encontrado!</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Selecione quais produtos deseja excluir. O primeiro de cada grupo (mais antigo) fica marcado para manter por padrão.
                </p>
                <button
                  onClick={selectAllDuplicates}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Selecionar todos os duplicados
                </button>
              </div>

              {groups.map((group, gi) => {
                const sorted = [...group].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                return (
                  <div key={gi} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-orange-50 px-4 py-2 border-b border-orange-100">
                      <p className="font-semibold text-orange-800 text-sm">
                        "{sorted[0].name}" — {group.length} produtos encontrados
                      </p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {sorted.map((product, idx) => {
                        const isSelected = selectedIds.has(product.id);
                        const isKeeping = idx === 0;
                        return (
                          <div
                            key={product.id}
                            className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                              isSelected ? 'bg-red-50' : ''
                            }`}
                            onClick={() => toggleSelect(product.id)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(product.id)}
                              className="w-4 h-4 accent-red-500"
                              onClick={e => e.stopPropagation()}
                            />
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded-lg border border-gray-200" />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-lg">📦</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                              <p className="text-xs text-gray-500 font-mono">{product.slug}</p>
                              <p className="text-xs text-gray-400">
                                Criado em: {new Date(product.created_at).toLocaleDateString('pt-BR')} |
                                Status: {product.is_active ? 'Ativo' : 'Inativo'} |
                                Custo: R$ {parseFloat(product.cost_price || 0).toFixed(2)}
                              </p>
                            </div>
                            {isKeeping && (
                              <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full whitespace-nowrap">
                                Manter
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded-full whitespace-nowrap">
                                Excluir
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && groups.length > 0 && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-red-600">{selectedIds.size}</span> produto(s) selecionado(s) para exclusão
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || selectedIds.size === 0}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Excluindo...' : `Excluir ${selectedIds.size} produto(s)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
