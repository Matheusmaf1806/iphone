import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/auth';
import { upsertProduct } from '../../../lib/products';

// Forçar rota dinâmica (usa cookies)
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Verificar autenticação
    const auth = await requireAuth();
    console.log('[POST /api/products] Auth result:', JSON.stringify(auth, null, 2));

    if (!auth.authenticated) {
      console.error('[POST /api/products] Authentication failed');
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    console.log('[POST /api/products] User authenticated:', auth.session.username);

    const { product } = await request.json();

    // Validar campos obrigatórios (price é calculado automaticamente)
    if (!product.name || !product.slug || !product.cost_price || !product.supplier_margin_percentage) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios faltando (name, slug, cost_price, supplier_margin_percentage)' },
        { status: 400 }
      );
    }

    // Criar produto com os campos do schema real
    const productData = {
      name: product.name,
      slug: product.slug,
      description: product.description || null,
      short_description: product.short_description || null,
      meta_title: product.meta_title || null,
      meta_description: product.meta_description || null,
      image_url: product.image_url || null,
      price: parseFloat(product.price),
      cost_price: product.cost_price ? parseFloat(product.cost_price) : null,
      supplier_margin_percentage: parseFloat(product.supplier_margin_percentage),
      sku: product.sku || null,
      stock_type: product.stock_type || 'unlimited',
      stock_quantity: parseInt(product.stock_quantity) || 0,
      low_stock_threshold: parseInt(product.low_stock_threshold) || 10,
      weight: product.weight ? parseFloat(product.weight) : null,
      height: product.height ? parseFloat(product.height) : null,
      width: product.width ? parseFloat(product.width) : null,
      depth: product.depth ? parseFloat(product.depth) : null,
      installments: parseInt(product.installments) || 1,
      installment_value: product.installment_value ? parseFloat(product.installment_value) : null,
      category: product.category || null,
      is_active: product.is_active !== false,
      is_featured: product.is_featured || false,
    };

    const productResult = await upsertProduct(productData);

    if (!productResult.success) {
      return NextResponse.json(
        { success: false, error: productResult.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      product: productResult.data,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Verificar autenticação
    const auth = await requireAuth();
    console.log('[PUT /api/products] Auth result:', JSON.stringify(auth, null, 2));

    if (!auth.authenticated) {
      console.error('[PUT /api/products] Authentication failed');
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    console.log('[PUT /api/products] User authenticated:', auth.session.username);

    const { product } = await request.json();

    if (!product.id) {
      return NextResponse.json(
        { success: false, error: 'ID do produto é obrigatório' },
        { status: 400 }
      );
    }

    // Se só veio id + image_url, é uma atualização parcial (ex: remoção de foto)
    if (product._partialUpdate) {
      const { createServerClient } = await import('../../../lib/supabase/server');
      const supabase = createServerClient();
      const updateFields = {};
      if ('image_url' in product) updateFields.image_url = product.image_url;

      const { data, error } = await supabase
        .from('products')
        .update(updateFields)
        .eq('id', product.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, product: data });
    }

    // Atualizar produto com os campos do schema real
    const productData = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || null,
      short_description: product.short_description || null,
      meta_title: product.meta_title || null,
      meta_description: product.meta_description || null,
      image_url: product.image_url || null,
      price: parseFloat(product.price),
      cost_price: product.cost_price ? parseFloat(product.cost_price) : null,
      supplier_margin_percentage: parseFloat(product.supplier_margin_percentage),
      sku: product.sku || null,
      stock_type: product.stock_type || 'unlimited',
      stock_quantity: parseInt(product.stock_quantity) || 0,
      low_stock_threshold: parseInt(product.low_stock_threshold) || 10,
      weight: product.weight ? parseFloat(product.weight) : null,
      height: product.height ? parseFloat(product.height) : null,
      width: product.width ? parseFloat(product.width) : null,
      depth: product.depth ? parseFloat(product.depth) : null,
      installments: parseInt(product.installments) || 1,
      installment_value: product.installment_value ? parseFloat(product.installment_value) : null,
      category: product.category || null,
      is_active: product.is_active !== false,
      is_featured: product.is_featured || false,
    };

    const productResult = await upsertProduct(productData);

    if (!productResult.success) {
      return NextResponse.json(
        { success: false, error: productResult.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      product: productResult.data,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
