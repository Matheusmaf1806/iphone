'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

// Cupons disponíveis (em produção, isso viria do backend)
const VALID_COUPONS = {
  'PRIMEIRACOMPRA': { type: 'percentage', value: 10, description: '10% de desconto' },
  'BEMVINDO': { type: 'percentage', value: 15, description: '15% de desconto' },
  'DESCONTO20': { type: 'percentage', value: 20, description: '20% de desconto' },
};

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [coupon, setCoupon] = useState(null);

  // Carregar carrinho do localStorage ao montar
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        // Carrinhos salvos antes do suporte a variantes não têm lineId — preenche
        // com o mesmo valor que addToCart usaria, pra não colidir itens diferentes.
        setCart(parsed.map(item => ({
          ...item,
          lineId: item.lineId || (item.variantId ? `${item.id}:${item.variantId}` : item.id),
        })));
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }
  }, []);

  // Salvar carrinho no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, quantity = 1) => {
    // Duas variantes do mesmo produto (ex: cores diferentes) precisam virar linhas
    // separadas no carrinho — a identidade da linha inclui o SKU quando existe.
    const lineId = product.variantId ? `${product.id}:${product.variantId}` : product.id;

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.lineId === lineId);

      if (existingItem) {
        return prevCart.map(item =>
          item.lineId === lineId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...prevCart, { ...product, lineId, quantity }];
    });

    // Mostrar notificação
    showNotification();

    // Abrir carrinho brevemente
    setIsOpen(true);
    setTimeout(() => setIsOpen(false), 3000);
  };

  const removeFromCart = (lineId) => {
    setCart(prevCart => prevCart.filter(item => item.lineId !== lineId));
  };

  const updateQuantity = (lineId, quantity, customMarkup) => {
    if (quantity <= 0) {
      removeFromCart(lineId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item => {
        if (item.lineId === lineId) {
          const updated = { ...item, quantity };
          if (customMarkup !== undefined) {
            updated.customMarkup = customMarkup;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const setItemCustomMarkup = (lineId, markup) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.lineId === lineId ? { ...item, customMarkup: markup } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const showNotification = () => {
    const notification = document.getElementById('cart-notification');
    if (notification) {
      notification.classList.add('show');
      setTimeout(() => notification.classList.remove('show'), 3000);
    }
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getDiscount = () => {
    if (!coupon || coupon.type !== 'percentage') return 0;
    return (getSubtotal() * coupon.value) / 100;
  };

  const getTotalPrice = () => {
    return getSubtotal() - getDiscount();
  };

  const applyCoupon = (code) => {
    const upperCode = code.toUpperCase().trim();
    const couponData = VALID_COUPONS[upperCode];

    if (couponData) {
      setCoupon({ code: upperCode, ...couponData });
      return { success: true, message: `Cupom "${upperCode}" aplicado com sucesso!` };
    }

    return { success: false, message: 'Cupom inválido' };
  };

  const removeCoupon = () => {
    setCoupon(null);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isOpen,
        setIsOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        setItemCustomMarkup,
        clearCart,
        getTotalItems,
        getSubtotal,
        getDiscount,
        getTotalPrice,
        coupon,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
