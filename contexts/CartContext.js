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
        setCart(JSON.parse(savedCart));
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
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);

      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...prevCart, { ...product, quantity }];
    });

    // Mostrar notificação
    showNotification();

    // Abrir carrinho brevemente
    setIsOpen(true);
    setTimeout(() => setIsOpen(false), 3000);
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity, customMarkup) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id === productId) {
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

  const setItemCustomMarkup = (productId, markup) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, customMarkup: markup } : item
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
