import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { createServerClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Verificar autenticação
    const auth = await requireAuth();

    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'ID do produto é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar produto original
    const { data: originalProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !originalProduct) {
      return NextResponse.json(
        { success: false, error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    // Criar cópia do produto
    const { id, created_at, updated_at, ...productData } = originalProduct;

    // Adicionar "- Cópia" ao nome e gerar novo slug
    const newName = `${productData.name} - Cópia`;
    const baseSlug = `${productData.slug}-copia`;

    // Verificar se o slug já existe e adicionar número se necessário
    let newSlug = baseSlug;
    let counter = 1;
    let slugExists = true;

    while (slugExists) {
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('slug', newSlug)
        .single();

      if (!existingProduct) {
        slugExists = false;
      } else {
        newSlug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    // Gerar novo SKU se existir
    const newSku = productData.sku ? `${productData.sku}-COPIA-${Date.now()}` : null;

    const duplicatedProduct = {
      ...productData,
      name: newName,
      slug: newSlug,
      sku: newSku,
      is_featured: false, // Produto duplicado não deve ser destacado por padrão
    };

    // Inserir produto duplicado
    const { data: newProduct, error: insertError } = await supabase
      .from('products')
      .insert([duplicatedProduct])
      .select()
      .single();

    if (insertError) {
      console.error('Error duplicating product:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    // Buscar e duplicar variantes do produto original
    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId);

    if (!variantsError && variants && variants.length > 0) {
      const duplicatedVariants = variants.map(variant => {
        const { id, created_at, updated_at, product_id, ...variantData } = variant;
        return {
          ...variantData,
          product_id: newProduct.id,
          sku: variant.sku ? `${variant.sku}-COPIA-${Date.now()}` : null,
        };
      });

      await supabase
        .from('product_variants')
        .insert(duplicatedVariants);
    }

    return NextResponse.json({
      success: true,
      product: newProduct,
    });
  } catch (error) {
    console.error('Error duplicating product:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
