import { NextResponse } from 'next/server';
import { createServerClient } from '../../../../lib/supabase/server';
import { requireAuth } from '../../../../lib/auth';
import { syncProductFromVariants } from '../../../../lib/products';

// POST - Cria/atualiza várias variantes de um produto em uma única chamada
// (usado pela matriz de variantes do admin, depois de "Gerar combinações")
export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { product_id, variants } = body;

    if (!product_id || !Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json(
        { success: false, error: 'product_id e variants (array) são obrigatórios' },
        { status: 400 }
      );
    }

    // No máximo uma linha pode ficar marcada como padrão — se vier mais de uma, mantém
    // só a última e desmarca o resto localmente antes de gravar.
    let defaultSeen = false;
    const rows = variants.map(v => {
      let isDefault = !!v.is_default;
      if (isDefault) {
        if (defaultSeen) isDefault = false;
        defaultSeen = true;
      }
      return { ...v, is_default: isDefault };
    });

    if (defaultSeen) {
      await supabase
        .from('product_variants')
        .update({ is_default: false })
        .eq('product_id', product_id);
    }

    const results = [];
    const errors = [];

    for (const row of rows) {
      const {
        id,
        sku,
        attributes,
        cost_price,
        cost_currency,
        import_tax_percentage,
        supplier_margin_percentage,
        stock_quantity,
        low_stock_threshold,
        weight,
        height,
        width,
        depth,
        image_url,
        is_default,
        is_active,
      } = row;

      if (!attributes || Object.keys(attributes).length === 0) {
        errors.push({ row, error: 'attributes é obrigatório' });
        continue;
      }

      const payload = {
        product_id,
        sku: sku || `VAR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        attributes,
        cost_price: cost_price || null,
        cost_currency: cost_currency || 'BRL',
        import_tax_percentage: import_tax_percentage != null && import_tax_percentage !== '' ? import_tax_percentage : null,
        supplier_margin_percentage: supplier_margin_percentage || null,
        stock_quantity: stock_quantity || 0,
        low_stock_threshold: low_stock_threshold || 10,
        weight: weight || null,
        height: height || null,
        width: width || null,
        depth: depth || null,
        image_url: image_url || null,
        is_default: is_default || false,
        is_active: is_active !== undefined ? is_active : true,
      };

      const query = id
        ? supabase.from('product_variants').update(payload).eq('id', id).select().single()
        : supabase.from('product_variants').insert([payload]).select().single();

      const { data, error } = await query;

      if (error) {
        errors.push({ row, error: error.message });
      } else {
        results.push(data);
      }
    }

    await syncProductFromVariants(product_id);

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json({ success: false, error: errors[0].error, errors }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: results, errors: errors.length ? errors : undefined });
  } catch (error) {
    console.error('Error bulk-saving product variants:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
