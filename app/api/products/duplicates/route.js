import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { findDuplicateProducts, deleteProductsByIds } from '../../../../lib/products';

export const dynamic = 'force-dynamic';

// GET /api/products/duplicates - Find duplicate products
export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const groups = await findDuplicateProducts();

    return NextResponse.json({
      success: true,
      groups,
      totalGroups: groups.length,
      totalDuplicates: groups.reduce((sum, g) => sum + g.length - 1, 0),
    });
  } catch (error) {
    console.error('Error finding duplicates:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/products/duplicates - Delete selected duplicate products
export async function DELETE(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'IDs inválidos' }, { status: 400 });
    }

    const result = await deleteProductsByIds(ids);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, deleted: result.deleted });
  } catch (error) {
    console.error('Error deleting duplicates:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
