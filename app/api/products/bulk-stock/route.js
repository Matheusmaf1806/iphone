import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { bulkSetUnlimitedStock } from '../../../../lib/products';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const result = await bulkSetUnlimitedStock();

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Estoque de todos os produtos definido como ilimitado.' });
  } catch (error) {
    console.error('Error in bulk-stock:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
