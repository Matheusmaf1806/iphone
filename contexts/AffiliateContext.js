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
      brandColor: '#0071e3',
      backgroundColor: '#ffffff',
      buttonColor: '#0071e3',
      buttonHover: '#0058b3',
      buttonTextColor: '#ffffff',
      buttonHover: '#0058b3',
      name: SITE_NAME,
      logo: '',
    };
  }
  return context;
}
