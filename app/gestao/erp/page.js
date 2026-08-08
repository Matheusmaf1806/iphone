import { redirect } from 'next/navigation';
import { requireAuth } from '../../../lib/auth';
import { getAllProductsAdmin } from '../../../lib/products';
import GestaoLayout from '../../../components/gestao/GestaoLayout';
import ProductList from '../../../components/gestao/ProductList';
import LowStockAlert from '../../../components/gestao/LowStockAlert';

export const metadata = {
  title: 'Gestão de Produtos - ERP',
};

export default async function ErpPage() {
  // Verificar autenticação
  const auth = await requireAuth();
  if (!auth.authenticated) {
    redirect(auth.redirect);
  }

  // Buscar todos os produtos (sem limite de 1000 linhas do Supabase)
  const products = await getAllProductsAdmin();

  // Find products with low stock or out of stock (limited stock only)
  const alertProducts = (products || []).filter(p => {
    if (p.stock_type === 'unlimited' || p.stock_quantity === -1) return false;
    const threshold = p.low_stock_threshold || 10;
    return p.stock_quantity <= threshold;
  });

  return (
    <GestaoLayout session={auth.session}>
      {/* Low Stock Alerts */}
      {alertProducts.length > 0 && (
        <LowStockAlert products={alertProducts} />
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestão de Produtos
        </h1>
        <p className="text-gray-600">
          Gerencie seus produtos, estoque e informações
        </p>
      </div>

      <ProductList initialProducts={products} />
    </GestaoLayout>
  );
}
