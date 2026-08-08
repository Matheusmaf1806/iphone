import './globals.css';
import { getAffiliateConfig } from '../lib/affiliate';
import ClientScripts from '../components/ClientScripts';
import { CartProvider } from '../contexts/CartContext';
import { AffiliateProvider } from '../contexts/AffiliateContext';
import { CustomerProvider } from '../contexts/CustomerContext';
import CartDrawer from '../components/CartDrawer';

export const metadata = {
  title: 'BrandPet - Tudo para o seu Pet',
  description: 'Rações, brinquedos, acessórios e tudo que seu pet precisa para ser feliz e saudável. As melhores marcas com os melhores preços.',
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
        <link rel="icon" href={affiliateConfig.favicon || '/logo/brand_pet_logo_azul.png'} type="image/png" />
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --brand-color: ${affiliateConfig.brandColor || '#f60c49'};
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
