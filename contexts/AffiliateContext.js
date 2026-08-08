'use client';

import { createContext, useContext } from 'react';

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
      brandColor: '#f60c49',
      backgroundColor: '#ffffff',
      buttonColor: '#f60c49',
      buttonHover: '#d40a3f',
      buttonTextColor: '#ffffff',
      buttonHover: '#d40a3f',
      name: 'Folha de Guiné',
      logo: 'https://brandpet.vercel.app/logo/brand_pet_logo_bege.png',
    };
  }
  return context;
}
