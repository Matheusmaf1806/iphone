'use client';

import { useState, useEffect } from 'react';
import AffiliateLayout from './AffiliateLayout';
import Loader from '../Loader';

export default function AffiliateSales({ session }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'all'
        ? '/api/affiliate/orders'
        : `/api/affiliate/orders?status=${statusFilter}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setOrders(data.data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pendente', icon: 'fa-clock' },
      paid: { color: 'bg-green-100 text-green-700', label: 'Pago', icon: 'fa-check-circle' },
      processing: { color: 'bg-blue-100 text-blue-700', label: 'Processando', icon: 'fa-spinner' },
      shipped: { color: 'bg-purple-100 text-purple-700', label: 'Enviado', icon: 'fa-shipping-fast' },
      delivered: { color: 'bg-green-100 text-green-700', label: 'Entregue', icon: 'fa-box-check' },
      cancelled: { color: 'bg-red-100 text-red-700', label: 'Cancelado', icon: 'fa-times-circle' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        <i className={`fas ${badge.icon}`}></i>
        {badge.label}
      </span>
    );
  };

  const totalCommission = orders.reduce((sum, order) => sum + order.commission, 0);
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

  return (
    <AffiliateLayout session={session}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <i className="fas fa-shopping-bag text-brand-yellow"></i>
            Minhas Vendas
          </h1>
          <p className="text-gray-600">
            Acompanhe todas as suas vendas e comissões
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-shopping-bag text-blue-600 text-xl"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                <p className="text-sm text-gray-600">Total de Vendas</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-dollar-sign text-green-600 text-xl"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {totalRevenue.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-sm text-gray-600">Faturamento Total</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-brand-yellow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-coins text-brand-yellow text-xl"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-yellow">
                  R$ {totalCommission.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-sm text-gray-600">Comissão Total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="flex flex-wrap gap-2">
            {['all', 'paid', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-brand-yellow text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Todos' : status === 'paid' ? 'Pagos' : status === 'pending' ? 'Pendentes' : status === 'processing' ? 'Processando' : status === 'shipped' ? 'Enviados' : status === 'delivered' ? 'Entregues' : 'Cancelados'}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <Loader size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Carregando vendas...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <i className="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
            <p className="text-xl font-semibold text-gray-900 mb-2">
              Nenhuma venda encontrada
            </p>
            <p className="text-gray-600">
              {statusFilter === 'all' ? 'Você ainda não tem vendas' : 'Nenhuma venda com este status'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-yellow bg-opacity-20 rounded-xl flex items-center justify-center">
                      <i className="fas fa-shopping-bag text-brand-yellow text-xl"></i>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{order.orderNumber}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(order.paymentStatus)}
                    <button
                      onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors"
                    >
                      <i className={`fas fa-chevron-${selectedOrder?.id === order.id ? 'up' : 'down'} mr-2`}></i>
                      Detalhes
                    </button>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-3 text-sm">
                    <i className="fas fa-user text-gray-400"></i>
                    <div>
                      <p className="text-gray-600">Cliente</p>
                      <p className="font-semibold text-gray-900">{order.customer.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <i className="fas fa-credit-card text-gray-400"></i>
                    <div>
                      <p className="text-gray-600">Pagamento</p>
                      <p className="font-semibold text-gray-900">
                        {order.paymentMethod === 'credit_card' ? 'Cartão de Crédito' : 'PIX'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <i className="fas fa-box text-gray-400"></i>
                    <div>
                      <p className="text-gray-600">Status</p>
                      <p className="font-semibold text-gray-900">
                        {order.status === 'pending' ? 'Pendente' : order.status === 'processing' ? 'Processando' : order.status === 'shipped' ? 'Enviado' : order.status === 'delivered' ? 'Entregue' : 'Cancelado'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-between items-center pt-4 border-t-2 border-gray-100">
                  <div>
                    <p className="text-sm text-gray-600">Total da Venda</p>
                    <p className="text-2xl font-bold text-gray-900">
                      R$ {order.total.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Sua Comissão</p>
                    <p className="text-2xl font-bold text-brand-yellow">
                      R$ {order.commission.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedOrder?.id === order.id && (
                  <div className="mt-6 pt-6 border-t-2 border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4">Itens do Pedido</h3>
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                          <img
                            src={item.productImage || '/placeholder.png'}
                            alt={item.productName}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{item.productName}</p>
                            <p className="text-sm text-gray-600">Quantidade: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                            </p>
                            <p className="text-sm text-brand-yellow font-semibold">
                              Comissão: R$ {item.commission.toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AffiliateLayout>
  );
}
