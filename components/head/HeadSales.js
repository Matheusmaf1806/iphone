'use client';

import { useEffect, useState } from 'react';
import HeadLayout from './HeadLayout';
import Loader from '../Loader';

const STATUS_LABELS = { pending: 'Pendente', paid: 'Pago', delivered: 'Entregue', cancelled: 'Cancelado' };
const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  delivered: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function HeadSales({ session }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session.ownAffiliateId) {
      setLoading(false);
      return;
    }
    fetch('/api/head/sales')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setOrders(data.data);
        else setError(data.error || 'Erro ao buscar vendas');
      })
      .catch((err) => {
        console.error('Error loading sales:', err);
        setError('Erro ao buscar vendas');
      })
      .finally(() => setLoading(false));
  }, [session.ownAffiliateId]);

  return (
    <HeadLayout session={session}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Minhas Vendas</h1>
        <p className="text-gray-600 text-sm mt-1">Pedidos da sua própria loja de afiliado</p>
      </div>

      {!session.ownAffiliateId ? (
        <div className="bg-white rounded-2xl shadow-md p-8 text-center text-gray-500 text-sm">
          Você não tem uma loja própria vinculada — esta seção é só pra Heads que também vendem.
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-40"><Loader size="md" /></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-8 text-center text-gray-500 text-sm">Nenhuma venda ainda.</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md divide-y divide-gray-100">
          {orders.map((order) => (
            <div key={order.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 text-sm">#{order.orderNumber} — {order.customerName}</p>
                <p className="text-xs text-gray-500">
                  {order.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}
                </p>
                <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gray-900 text-sm">R$ {order.commission.toFixed(2).replace('.', ',')}</p>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.paymentStatus] || STATUS_COLORS.pending}`}>
                  {STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </HeadLayout>
  );
}
