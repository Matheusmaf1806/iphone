import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/auth';
import { createServerClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET - list images for a product
export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    if (!productId) {
      return NextResponse.json({ success: false, error: 'product_id é obrigatório' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('position', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, images: data || [] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}

// POST - sync all images for a product (replaces existing)
export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { product_id, images } = await request.json();
    if (!product_id || !Array.isArray(images)) {
      return NextResponse.json({ success: false, error: 'product_id e images são obrigatórios' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Delete existing images for this product
    await supabase
      .from('product_images')
      .delete()
      .eq('product_id', product_id);

    // Insert new images
    if (images.length > 0) {
      const rows = images.map((img, idx) => ({
        product_id,
        url: img.url,
        alt_text: img.alt_text || null,
        position: idx,
        is_primary: idx === 0,
      }));

      const { error } = await supabase
        .from('product_images')
        .insert(rows);

      if (error) {
        console.error('Error inserting product images:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error syncing product images:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - remove a specific image by URL and update product
export async function DELETE(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { product_id, image_url } = await request.json();
    if (!product_id || !image_url) {
      return NextResponse.json({ success: false, error: 'product_id e image_url são obrigatórios' }, { status: 400 });
    }

    const supabase = createServerClient();

    // 1. Delete from product_images table
    await supabase
      .from('product_images')
      .delete()
      .eq('product_id', product_id)
      .eq('url', image_url);

    // 2. Get remaining images from product_images
    const { data: remaining } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', product_id)
      .order('position', { ascending: true });

    // 3. Reorder remaining images
    if (remaining && remaining.length > 0) {
      for (let i = 0; i < remaining.length; i++) {
        await supabase
          .from('product_images')
          .update({ position: i, is_primary: i === 0 })
          .eq('id', remaining[i].id);
      }
    }

    // 4. ALWAYS update products.image_url - set to first remaining or null
    const newImageUrl = (remaining && remaining.length > 0) ? remaining[0].url : null;
    await supabase
      .from('products')
      .update({ image_url: newImageUrl })
      .eq('id', product_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product image:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}
