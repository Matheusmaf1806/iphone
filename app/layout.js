import './globals.css';
import { getAffiliateConfig } from '../lib/affiliate';
import ClientScripts from '../components/ClientScripts';
import { CartProvider } from '../contexts/CartContext';
import { AffiliateProvider } from '../contexts/AffiliateContext';
import { CustomerProvider } from '../contexts/CustomerContext';
import CartDrawer from '../components/CartDrawer';
import { SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION } from '../lib/siteConfig';

export const metadata = {
  title: `${SITE_NAME} - ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
};

export default async function RootLayout({ children }) {
  // Obter configuração do afiliado baseado no domínio
  const affiliateConfig = await getAffiliateConfig();

  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
        {affiliateConfig.favicon && (
          <link rel="icon" href={affiliateConfig.favicon} type="image/png" />
        )}
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --brand-color: ${affiliateConfig.brandColor || '#0071e3'};
            }
          `
        }} />
      </head>
      <body className="bg-white">
        <AffiliateProvider config={affiliateConfig}>
          <CustomerProvider>
            <CartProvider>
              <ClientScripts />
              {children}
              <CartDrawer />
            </CartProvider>
          </CustomerProvider>
        </AffiliateProvider>
      </body>
    </html>
  );
}
