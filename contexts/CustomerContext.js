'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const CustomerContext = createContext(null);

export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar sessão ao montar
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const res = await fetch('/api/customer/me');
      const data = await res.json();
      if (data.success && data.user) {
        setCustomer(data.user);
      }
    } catch (error) {
      console.error('Error checking customer session:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const res = await fetch('/api/customer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (data.success) {
      setCustomer(data.user);
    }
    return data;
  }

  async function register(name, email, password) {
    const res = await fetch('/api/customer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (data.success) {
      setCustomer(data.user);
    }
    return data;
  }

  async function logout() {
    await fetch('/api/customer/logout', { method: 'POST' });
    setCustomer(null);
  }

  return (
    <CustomerContext.Provider value={{ customer, loading, login, register, logout }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (!context) {
    return { customer: null, loading: false, login: async () => {}, register: async () => {}, logout: async () => {} };
  }
  return context;
}
