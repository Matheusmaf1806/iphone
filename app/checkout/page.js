import Header from '../../components/Header';
import Footer from '../../components/Footer';
import CheckoutForm from '../../components/CheckoutForm';
import { getCurrentContext } from '../../lib/affiliateTracking';

export default async function CheckoutPage() {
  const { affiliate, config } = await getCurrentContext();

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gray-50 py-8">
        <CheckoutForm
          affiliate={affiliate}
          config={config}
        />
      </main>

      <Footer />
    </>
  );
}
