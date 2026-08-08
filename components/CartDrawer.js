'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../contexts/CartContext';
import { useAffiliate } from '../contexts/AffiliateContext';

export default function CartDrawer() {
  const {
    cart,
    isOpen,
    setIsOpen,
    removeFromCart,
    updateQuantity,
    getSubtotal,
    getDiscount,
    getTotalPrice,
    coupon,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const affiliate = useAffiliate();
  const router = useRouter();

  const [couponCode, setCouponCode] = useState('');
  const [agentSession, setAgentSession] = useState(null);
  const [showMarkupModal, setShowMarkupModal] = useState(false);
  const [markupValues, setMarkupValues] = useState({});
  const [couponMessage, setCouponMessage] = useState({ text: '', type: '' });

  // Detect if current user is an agent
  useEffect(() => {
    async function checkAgentSession() {
      try {
        const res = await fetch('/api/affiliate/session');
        if (res.ok) {
          const data = await res.json();
          if (data.session && data.session.role === 'agent') {
            setAgentSession(data.session);
          }
        }
      } catch (e) {
        // Not logged in as agent - that's fine
      }
    }
    if (isOpen) {
      checkAgentSession();
    }
  }, [isOpen]);

  // Initialize markup values from cart items
  useEffect(() => {
    if (agentSession && cart.length > 0) {
      const initial = {};
      cart.forEach(item => {
        initial[item.id] = item.customMarkup !== undefined ? item.customMarkup : '';
      });
      setMarkupValues(initial);
    }
  }, [agentSession, cart]);

  const handleCheckout = () => {
    setIsOpen(false);
    router.push('/checkout');
  };

  const handleApplyMarkup = () => {
    Object.entries(markupValues).forEach(([productId, markup]) => {
      const numericMarkup = parseFloat(markup);
      if (!isNaN(numericMarkup) && numericMarkup >= 0) {
        updateQuantity(parseInt(productId), cart.find(i => i.id === parseInt(productId))?.quantity || 1, numericMarkup);
      }
    });
    setShowMarkupModal(false);
  };

  if (!isOpen) return null;

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      setCouponMessage({ text: 'Digite um cupom', type: 'error' });
      return;
    }

    const result = applyCoupon(couponCode);
    setCouponMessage({ text: result.message, type: result.success ? 'success' : 'error' });

    if (result.success) {
      setCouponCode('');
      setTimeout(() => setCouponMessage({ text: '', type: '' }), 3000);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponMessage({ text: '', type: '' });
  };

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const total = getTotalPrice();

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-60 z-50 transition-opacity backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Header Premium - Compacto */}
        <div
          className="relative p-4 overflow-hidden"
          style={{
            background: `linear-gradient(to bottom right, ${affiliate.buttonColor || '#0071e3'}, ${affiliate.buttonHover || '#0058b3'}, ${affiliate.buttonColor || '#0071e3'})`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shimmer"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
                style={{
                  backgroundColor: affiliate.buttonTextColor || '#000000',
                  color: affiliate.buttonColor || '#0071e3'
                }}
              >
                <i className="fas fa-shopping-cart text-sm"></i>
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: affiliate.buttonTextColor || '#000000' }}>Meu Carrinho</h2>
                <p className="text-xs font-medium" style={{ color: affiliate.buttonTextColor || '#000000' }}>
                  {cart.length} {cart.length === 1 ? 'item' : 'itens'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="transition-all w-8 h-8 rounded-full flex items-center justify-center"
              style={{ color: affiliate.buttonTextColor || '#000000' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = affiliate.buttonTextColor || '#000000';
                e.currentTarget.style.color = affiliate.buttonColor || '#0071e3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = affiliate.buttonTextColor || '#000000';
              }}
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
        </div>

        {/* Cart Items - Compacto */}
        <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-24 h-24 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-shopping-cart text-4xl text-gray-400"></i>
              </div>
              <p className="text-gray-700 text-lg font-bold mb-2">Carrinho vazio</p>
              <p className="text-gray-500 text-sm mb-4">
                Adicione produtos para começar!
              </p>
              <button
                onClick={() => setIsOpen(false)}
                className="font-bold py-2 px-6 rounded-full transition-all transform hover:scale-105 shadow-lg text-sm"
                style={{
                  backgroundColor: affiliate.buttonColor || '#0071e3',
                  color: affiliate.buttonTextColor || '#000000'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = affiliate.buttonHover || '#0058b3'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = affiliate.buttonColor || '#0071e3'}
              >
                Explorar Produtos
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-100"
                  style={{ borderColor: 'rgb(243 244 246)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = affiliate.buttonColor || '#0071e3'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgb(243 244 246)'}
                >
                  {/* Image - Menor */}
                  <div className="relative flex-shrink-0">
                    {(item.image_url || item.image || (item.images && item.images.length > 0)) ? (
                      <img
                        src={item.image_url || item.image || item.images?.[0]?.src}
                        alt={item.name}
                        className="w-16 h-16 object-contain rounded-md bg-gray-50"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-md flex items-center justify-center">
                        <i className="fas fa-image text-gray-400 text-sm"></i>
                      </div>
                    )}
                  </div>

                  {/* Info - Compacto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-xs leading-tight line-clamp-2">
                        {item.name}
                      </h3>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                        title="Remover"
                      >
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                    </div>

                    {/* Price e Quantity na mesma linha */}
                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity Controls - Compacto */}
                      <div className="flex items-center gap-1 bg-gray-100 rounded-full px-1 py-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-5 h-5 flex items-center justify-center bg-white rounded-full transition-all"
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = affiliate.buttonColor || '#0071e3'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          <i className="fas fa-minus text-[8px]"></i>
                        </button>
                        <span className="w-6 text-center font-bold text-xs">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-5 h-5 flex items-center justify-center rounded-full transition-all"
                          style={{
                            backgroundColor: affiliate.buttonColor || '#0071e3',
                            color: affiliate.buttonTextColor || '#000000'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = affiliate.buttonHover || '#0058b3'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = affiliate.buttonColor || '#0071e3'}
                        >
                          <i className="fas fa-plus text-[8px]"></i>
                        </button>
                      </div>

                      {/* Price - Compacto */}
                      <div className="text-right">
                        <p className="font-bold text-sm leading-none" style={{ color: affiliate.buttonColor || '#0071e3' }}>
                          R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Coupon and Total - Compacto */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 bg-white">
            {/* Cupom Section - Compacto */}
            <div className="p-3 pb-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <i className="fas fa-ticket-alt text-xs" style={{ color: affiliate.buttonColor || '#0071e3' }}></i>
                Cupom
              </label>

              {!coupon ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    placeholder="Digite aqui"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none transition-colors text-xs font-medium uppercase"
                    onFocus={(e) => e.target.style.borderColor = affiliate.buttonColor || '#0071e3'}
                    onBlur={(e) => e.target.style.borderColor = 'rgb(209 213 219)'}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    className="font-bold px-4 py-2 rounded-lg transition-all text-xs"
                    style={{
                      backgroundColor: affiliate.buttonColor || '#0071e3',
                      color: affiliate.buttonTextColor || '#000000'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = affiliate.buttonHover || '#0058b3'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = affiliate.buttonColor || '#0071e3'}
                  >
                    Aplicar
                  </button>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-400 rounded-lg p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-green-400 text-white w-6 h-6 rounded-full flex items-center justify-center">
                      <i className="fas fa-check text-xs"></i>
                    </div>
                    <div>
                      <p className="font-bold text-green-800 text-xs">{coupon.code}</p>
                      <p className="text-green-600 text-[10px]">{coupon.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-all"
                  >
                    <i className="fas fa-times text-xs"></i>
                  </button>
                </div>
              )}

              {couponMessage.text && (
                <p
                  className={`text-xs mt-1 font-medium ${
                    couponMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {couponMessage.text}
                </p>
              )}

              {/* Cupons sugeridos - Compacto */}
              {!coupon && (
                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-gray-500">Cupons:</span>
                  {['BEMVINDO', 'DESCONTO20'].map((code) => (
                    <button
                      key={code}
                      onClick={() => {
                        setCouponCode(code);
                        applyCoupon(code);
                      }}
                      className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-bold transition-colors"
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = affiliate.buttonColor || '#0071e3'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(243 244 246)'}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Total Section - Compacto */}
            <div className="p-3 space-y-2">
              {/* Subtotal */}
              <div className="flex justify-between items-center text-gray-700 text-sm">
                <span className="font-medium">Subtotal:</span>
                <span className="font-bold">
                  R$ {subtotal.toFixed(2).replace('.', ',')}
                </span>
              </div>

              {/* Desconto */}
              {discount > 0 && (
                <div className="flex justify-between items-center text-green-600 text-sm">
                  <span className="font-medium flex items-center gap-1">
                    <i className="fas fa-tag text-xs"></i>
                    Desconto:
                  </span>
                  <span className="font-bold">
                    - R$ {discount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-base font-bold text-gray-800">Total:</span>
                <span className="text-xl font-bold" style={{ color: affiliate.buttonColor || '#0071e3' }}>
                  R$ {total.toFixed(2).replace('.', ',')}
                </span>
              </div>

              {/* Agent Markup Button */}
              {agentSession && (
                <div className="pb-2">
                  <button
                    onClick={() => setShowMarkupModal(true)}
                    className="w-full font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-xs border-2 border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100"
                  >
                    <i className="fas fa-percentage"></i>
                    Editar Markup do Pedido
                  </button>
                </div>
              )}

              {/* Buttons - Compacto */}
              <div className="space-y-1.5 pt-1">
                <button
                  onClick={handleCheckout}
                  className="w-full font-bold py-3 rounded-lg hover:shadow-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                  style={{ background: 'linear-gradient(to right, #101942, #1a2560)', color: affiliate.buttonColor || '#0071e3' }}
                >
                  <i className="fas fa-check-circle"></i>
                  Finalizar Compra
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full bg-gray-100 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-200 transition-colors text-xs"
                >
                  Continuar Comprando
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Agent Markup Modal */}
      {showMarkupModal && agentSession && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-70 z-[60]"
            onClick={() => setShowMarkupModal(false)}
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-percentage"></i>
                    <div>
                      <h3 className="font-bold text-sm">Markup do Pedido</h3>
                      <p className="text-xs opacity-90">Agente: {agentSession.fullName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMarkupModal(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <i className="fas fa-times text-sm"></i>
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto max-h-[50vh]">
                <p className="text-xs text-gray-500 mb-3">
                  Defina o markup (%) para cada produto deste pedido. Isso não altera o markup padrão.
                </p>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      {(item.image_url || item.image) && (
                        <img
                          src={item.image_url || item.image}
                          alt={item.name}
                          className="w-10 h-10 object-contain rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                        <p className="text-[10px] text-gray-500">Preço base: R$ {(item.price || 0).toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={markupValues[item.id] || ''}
                          onChange={(e) => setMarkupValues(prev => ({
                            ...prev,
                            [item.id]: e.target.value
                          }))}
                          placeholder="0"
                          className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-center focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-xs text-gray-500 font-bold">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 flex gap-2">
                <button
                  onClick={() => setShowMarkupModal(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApplyMarkup}
                  className="flex-1 py-2 rounded-lg bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition-colors"
                >
                  Aplicar Markup
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </>
  );
}
