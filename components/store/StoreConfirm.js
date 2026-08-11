'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StoreLayout from './StoreLayout';
import Loader from '../Loader';

export default function StoreConfirm({ session, token }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [justConfirmed, setJustConfirmed] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [token]);

  const loadOrder = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/store/pickup?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
      } else {
        setError(data.error || 'Pedido não encontrado');
      }
    } catch (err) {
      console.error('Error loading pickup order:', err);
      setError('Erro ao buscar pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setConfirmError('');
    try {
      const res = await fetch('/api/store/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) {
        setJustConfirmed(true);
        loadOrder();
      } else {
        setConfirmError(data.error || 'Erro ao confirmar retirada');
      }
    } catch (err) {
      console.error('Error confirming pickup:', err);
      setConfirmError('Erro ao confirmar retirada');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <StoreLayout session={session}>
      <Link href="/loja/adm" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-2 mb-4">
        <i className="fas fa-arrow-left"></i>
        Buscar outro pedido
      </Link>

      {loading && (
        <div className="flex items-center justify-center h-40">
          <Loader size="md" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-white rounded-2xl shadow-md p-8 text-center">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-times text-2xl text-red-600"></i>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Pedido não encontrado</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      )}

      {!loading && order && (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Pedido</p>
            <h1 className="text-2xl font-bold text-gray-900">#{order.order_number}</h1>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Cliente</p>
              <p className="font-semibold text-gray-900">{order.customer_name}</p>
              <p className="text-sm text-gray-500">{order.customer_email} · {order.customer_phone}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Local de retirada</p>
              <p className="font-semibold text-gray-900">
                {order.pickup_locations?.name || order.pickup_location}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">Itens</p>
              <ul className="space-y-1">
                {(order.order_items || []).map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-800 flex justify-between gap-2">
                    <span>{item.product_name}</span>
                    <span className="text-gray-500">x{item.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>

            {order.payment_status !== 'paid' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3">
                <i className="fas fa-exclamation-triangle mt-0.5"></i>
                <p>Pagamento ainda não confirmado — não é possível entregar este pedido.</p>
              </div>
            )}

            {order.status === 'delivered' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 flex items-start gap-3">
                <i className="fas fa-check-circle mt-0.5"></i>
                <p>
                  {justConfirmed ? 'Retirada confirmada agora.' : 'Pedido já retirado'} em{' '}
                  {new Date(order.delivered_at).toLocaleString('pt-BR')}.
                </p>
              </div>
            )}

            {confirmError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {confirmError}
              </div>
            )}

            {order.payment_status === 'paid' && order.status !== 'delivered' && (
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                {confirming ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-spinner fa-spin"></i>
                    Confirmando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-check"></i>
                    Confirmar retirada e entregar aparelho
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </StoreLayout>
  );
}
