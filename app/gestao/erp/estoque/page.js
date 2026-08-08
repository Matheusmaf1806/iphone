import { redirect } from 'next/navigation';
import { requireAuth } from '../../../../lib/auth';
import { getAllProductsAdmin } from '../../../../lib/products';
import GestaoLayout from '../../../../components/gestao/GestaoLayout';
import StockManager from '../../../../components/gestao/StockManager';

export const metadata = {
  title: 'Gestão de Estoque - ERP',
};

export default async function EstoquePage() {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  const allProducts = await getAllProductsAdmin();
  // Only show products with limited stock (stock_type !== 'unlimited' and stock_quantity >= 0)
  const stockProducts = (allProducts || []).filter(p =>
    p.stock_type !== 'unlimited' && p.stock_quantity !== -1
  );

  return (
    <GestaoLayout session={auth.session}>
      <StockManager products={stockProducts} />
    </GestaoLayout>
  );
}
