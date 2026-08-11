'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StoreLayout from './StoreLayout';

export default function StoreSearch({ session }) {
  const router = useRouter();
  const [token, setToken] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleaned = token.trim();
    if (!cleaned) return;
    router.push(`/loja/adm/${encodeURIComponent(cleaned)}`);
  };

  return (
    <StoreLayout session={session}>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Retirada de pedido</h1>
      <p className="text-gray-600 text-sm mb-6">
        Bipe o QR Code do voucher do cliente com a câmera do celular (abre direto aqui), ou digite o
        código manualmente abaixo.
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 transition-colors font-mono text-sm"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!token.trim()}
            className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-search mr-2"></i>
            Buscar pedido
          </button>
        </form>
      </div>
    </StoreLayout>
  );
}
