import { NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase/server';

// GET - List variants for a product or get variant types
export async function GET(request) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const getTypes = searchParams.get('types');

    // Get variant types
    if (getTypes === 'true') {
      const { data, error } = await supabase
        .from('product_variant_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    // Get variants for a product
    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching product variants:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new variant
export async function POST(request) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      product_id,
      sku,
      attributes,
      price_adjustment,
      price_adjustment_type,
      stock_quantity,
      low_stock_threshold,
      weight,
      height,
      width,
      depth,
      image_url,
      is_active
    } = body;

    if (!product_id || !attributes) {
      return NextResponse.json(
        { success: false, error: 'product_id and attributes are required' },
        { status: 400 }
      );
    }

    // Generate SKU if not provided
    const variantSku = sku || `VAR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const { data, error } = await supabase
      .from('product_variants')
      .insert([{
        product_id,
        sku: variantSku,
        attributes,
        price_adjustment: price_adjustment || 0,
        price_adjustment_type: price_adjustment_type || 'fixed',
        stock_quantity: stock_quantity || 0,
        low_stock_threshold: low_stock_threshold || 10,
        weight,
        height,
        width,
        depth,
        image_url,
        is_active: is_active !== undefined ? is_active : true
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating product variant:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a variant
export async function PUT(request) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Variant id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('product_variants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating product variant:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a variant
export async function DELETE(request) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Variant id is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product variant:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
