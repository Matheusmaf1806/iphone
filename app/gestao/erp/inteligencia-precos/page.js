import { redirect } from 'next/navigation';
import { requireAuth } from '../../../../lib/auth';
import { getAllProductsAdmin } from '../../../../lib/products';
import GestaoLayout from '../../../../components/gestao/GestaoLayout';
import PriceIntelligence from '../../../../components/gestao/PriceIntelligence';

export const metadata = {
  title: 'Inteligência de Preços - ERP',
};

export default async function InteligenciaPrecosPage() {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  const products = await getAllProductsAdmin();

  return (
    <GestaoLayout session={auth.session}>
      <PriceIntelligence products={products} />
    </GestaoLayout>
  );
}
