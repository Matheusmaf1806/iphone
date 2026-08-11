'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AffiliateLayout from './AffiliateLayout';

export default function PickupSearch({ session }) {
  const router = useRouter();
  const [token, setToken] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleaned = token.trim();
    if (!cleaned) return;
    router.push(`/afiliado/adm/retiradas/${encodeURIComponent(cleaned)}`);
  };

  return (
    <AffiliateLayout session={session}>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Retiradas</h1>
        <p className="text-gray-600 text-sm mb-6">
          Bipe o QR Code do voucher do cliente com a câmera do celular (abre direto aqui), ou digite o
          código do pedido manualmente abaixo.
        </p>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Código do voucher</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Cole ou digite o código do voucher"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-yellow transition-colors font-mono text-sm"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!token.trim()}
              className="w-full bg-gradient-to-r from-brand-yellow to-yellow-400 text-gray-900 font-bold py-3.5 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-search mr-2"></i>
              Buscar pedido
            </button>
          </form>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-3">
          <i className="fas fa-info-circle mt-0.5"></i>
          <p>
            O QR Code do voucher aponta direto para a tela de confirmação de retirada — não precisa
            digitar nada se o celular conseguir ler o código.
          </p>
        </div>
      </div>
    </AffiliateLayout>
  );
}
