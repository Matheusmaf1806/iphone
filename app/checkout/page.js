import Header from '../../components/Header';
import Footer from '../../components/Footer';
import CheckoutForm from '../../components/CheckoutForm';
import { getCurrentContext } from '../../lib/affiliateTracking';
import { getInstallmentFees } from '../../lib/installmentFees';

export default async function CheckoutPage() {
  const { affiliate, config } = await getCurrentContext();
  const installmentFees = await getInstallmentFees();

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gray-50 py-8">
        <CheckoutForm
          affiliate={affiliate}
          config={config}
          installmentFees={installmentFees}
        />
      </main>

      <Footer />
    </>
  );
}
