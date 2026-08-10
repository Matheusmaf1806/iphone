import { NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase/server';
import { requireAuth } from '../../../lib/auth';

// GET ?productId=X       -> lista acessórios já ligados a esse produto
// GET ?search=Y&excludeProductId=X -> busca produtos (qualquer status) pra
//   escolher como acessório novo, no admin
export async function GET(request) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const search = searchParams.get('search');

    if (search !== null) {
      const auth = await requireAuth();
      if (!auth.authenticated) {
        return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
      }

      const excludeProductId = searchParams.get('excludeProductId');
      if (search.trim().length < 2) {
        return NextResponse.json({ success: true, data: [] });
      }

      let query = supabase
        .from('products')
        .select('id, name, slug, image_url, category, is_active')
        .ilike('name', `%${search.trim()}%`)
        .order('name')
        .limit(15);
      if (excludeProductId) {
        query = query.neq('id', excludeProductId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    }

    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('product_accessories')
      .select(`
        id,
        is_default_checked,
        display_order,
        accessory:products!product_accessories_accessory_product_id_fkey(id, name, slug, image_url, category, is_active)
      `)
      .eq('product_id', productId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching product accessories:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - liga um produto como acessório compatível de outro
export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { productId, accessoryProductId, isDefaultChecked, displayOrder } = body;

    if (!productId || !accessoryProductId) {
      return NextResponse.json({ success: false, error: 'productId e accessoryProductId são obrigatórios' }, { status: 400 });
    }
    if (productId === accessoryProductId) {
      return NextResponse.json({ success: false, error: 'Um produto não pode ser acessório de si mesmo' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('product_accessories')
      .insert({
        product_id: productId,
        accessory_product_id: accessoryProductId,
        is_default_checked: !!isDefaultChecked,
        display_order: displayOrder || 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: false, error: 'Esse acessório já está ligado a este produto' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating product accessory link:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - atualiza is_default_checked / display_order de um vínculo existente
export async function PUT(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { id, isDefaultChecked, displayOrder } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
    }

    const updates = {};
    if (isDefaultChecked !== undefined) updates.is_default_checked = !!isDefaultChecked;
    if (displayOrder !== undefined) updates.display_order = displayOrder;

    const { error } = await supabase
      .from('product_accessories')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating product accessory link:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE ?id=X - remove um vínculo
export async function DELETE(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
    }

    const { error } = await supabase
      .from('product_accessories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product accessory link:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
