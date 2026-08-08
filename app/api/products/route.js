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

    // Validar campos obrigatórios. Produtos com variações (has_variants) não têm
    // custo próprio — o custo vive em cada SKU e price/cost_price são calculados
    // automaticamente quando as variantes são salvas.
    if (!product.name || !product.slug || !product.supplier_margin_percentage) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios faltando (name, slug, supplier_margin_percentage)' },
        { status: 400 }
      );
    }
    if (!product.has_variants && !product.cost_price) {
      return NextResponse.json(
        { success: false, error: 'Campo obrigatório faltando (cost_price)' },
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
      price: product.price ? parseFloat(product.price) : null,
      cost_price: product.cost_price ? parseFloat(product.cost_price) : null,
      cost_currency: product.has_variants ? 'BRL' : (product.cost_currency || 'BRL'),
      import_tax_percentage: product.has_variants ? null : (product.import_tax_percentage != null && product.import_tax_percentage !== '' ? parseFloat(product.import_tax_percentage) : null),
      supplier_margin_percentage: parseFloat(product.supplier_margin_percentage),
      sku: product.sku || null,
      has_variants: product.has_variants || false,
      stock_type: product.has_variants ? 'limited' : (product.stock_type || 'unlimited'),
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
      price: product.price ? parseFloat(product.price) : null,
      cost_price: product.cost_price ? parseFloat(product.cost_price) : null,
      cost_currency: product.has_variants ? 'BRL' : (product.cost_currency || 'BRL'),
      import_tax_percentage: product.has_variants ? null : (product.import_tax_percentage != null && product.import_tax_percentage !== '' ? parseFloat(product.import_tax_percentage) : null),
      supplier_margin_percentage: parseFloat(product.supplier_margin_percentage),
      sku: product.sku || null,
      has_variants: product.has_variants || false,
      stock_type: product.has_variants ? 'limited' : (product.stock_type || 'unlimited'),
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
