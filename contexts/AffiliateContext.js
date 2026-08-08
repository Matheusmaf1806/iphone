'use client';

import { createContext, useContext } from 'react';
import { SITE_NAME } from '../lib/siteConfig';

const AffiliateContext = createContext(null);

export function AffiliateProvider({ children, config }) {
  return (
    <AffiliateContext.Provider value={config}>
      {children}
    </AffiliateContext.Provider>
  );
}

export function useAffiliate() {
  const context = useContext(AffiliateContext);
  if (!context) {
    // Retornar config padrão se não houver contexto
    return {
      brandColor: '#0043f7',
      backgroundColor: '#ebf0f6',
      buttonColor: '#0043f7',
      buttonHover: '#0036c6',
      buttonTextColor: '#ffffff',
      buttonHover: '#0036c6',
      name: SITE_NAME,
      logo: '',
    };
  }
  return context;
}
