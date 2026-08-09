'use client';

import { useEffect, useState } from 'react';
import Loader from '../Loader';

export default function InstallmentFeesManager() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingInstallments, setEditingInstallments] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFees();
  }, []);

  const loadFees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/installment-fees');
      const data = await res.json();
      if (data.success) {
        setFees(data.data);
      }
    } catch (err) {
      console.error('Error loading installment fees:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (fee) => {
    setEditingInstallments(fee.installments);
    setEditValue(String(fee.fee_percentage));
  };

  const cancelEdit = () => {
    setEditingInstallments(null);
    setEditValue('');
  };

  const saveEdit = async (fee) => {
    const numericValue = parseFloat(editValue.replace(',', '.'));
    if (isNaN(numericValue) || numericValue < 0) {
      alert('Digite uma taxa válida');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/installment-fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ installments: fee.installments, feePercentage: numericValue }),
      });
      const data = await res.json();
      if (data.success) {
        setFees((prev) => prev.map((f) => (f.installments === fee.installments ? { ...f, fee_percentage: numericValue } : f)));
        setEditingInstallments(null);
        setEditValue('');
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (err) {
      console.error('Error saving installment fee:', err);
      alert('Erro ao salvar taxa');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-40"><Loader size="md" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Taxa do cartão por parcela</h2>
        <p className="text-gray-600 text-sm">
          Usada pelo assistente de compra da home pra calcular o preço certo pro número de parcelas
          que o cliente escolher. Os valores atuais são fictícios — troque pelos reais assim que o
          gateway de pagamento novo for integrado.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
        {fees.map((fee) => (
          <div key={fee.installments} className="p-4 flex items-center justify-between gap-4">
            <p className="font-medium text-gray-900">{fee.installments}x</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              {editingInstallments === fee.installments ? (
                <>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(fee);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="w-24 px-3 py-2 border border-blue-400 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <span className="text-gray-500 text-sm">%</span>
                  <button
                    onClick={() => saveEdit(fee)}
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
                  <span className="text-lg font-bold text-gray-900">{parseFloat(fee.fee_percentage).toFixed(2)}%</span>
                  <button
                    onClick={() => startEdit(fee)}
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
