import { NextResponse } from 'next/server';
import { getAffiliateSession } from '../../../../lib/affiliateAuth';
import { createServerClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET - Lista todas as margens customizadas do afiliado
 * Query params:
 *   - product_id: filtrar por produto específico
 */
export async function GET(request) {
  try {
    const session = getAffiliateSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Serviço não configurado' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    let query = supabase
      .from('affiliate_product_commissions')
      .select(`
        id,
        product_id,
        custom_commission_rate,
        notes,
        created_at,
        updated_at,
        products (
          id,
          name,
          slug,
          price,
          cost_price,
          supplier_margin_percentage,
          image_url
        )
      `)
      .eq('affiliate_id', session.affiliateId);

    if (productId) {
      query = query.eq('product_id', parseInt(productId));
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching custom commissions:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar margens customizadas' },
        { status: 500 }
      );
    }

    // Buscar margem padrão do afiliado
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('commission_rate')
      .eq('id', session.affiliateId)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        customCommissions: data,
        defaultCommissionRate: affiliate?.commission_rate || 10.00,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/affiliate/product-commissions:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
      );
  }
}

/**
 * POST - Cria ou atualiza uma margem customizada para um produto
 * Body: { product_id, custom_commission_rate, notes }
 */
export async function POST(request) {
  try {
    const session = getAffiliateSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { product_id, custom_commission_rate, notes } = body;

    // Validações
    if (!product_id) {
      return NextResponse.json(
        { success: false, error: 'ID do produto é obrigatório' },
        { status: 400 }
      );
    }

    if (custom_commission_rate === undefined || custom_commission_rate === null) {
      return NextResponse.json(
        { success: false, error: 'Taxa de comissão é obrigatória' },
        { status: 400 }
      );
    }

    const rate = parseFloat(custom_commission_rate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return NextResponse.json(
        { success: false, error: 'Taxa de comissão deve estar entre 0 e 100' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Serviço não configurado' },
        { status: 500 }
      );
    }

    // Verificar se o produto existe
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    // Usar upsert para criar ou atualizar
    const { data, error } = await supabase
      .from('affiliate_product_commissions')
      .upsert(
        {
          affiliate_id: session.affiliateId,
          product_id: parseInt(product_id),
          custom_commission_rate: rate,
          notes: notes || null,
        },
        {
          onConflict: 'affiliate_id,product_id',
          returning: 'representation',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting custom commission:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao salvar margem customizada' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Margem customizada salva com sucesso',
      data,
    });
  } catch (error) {
    console.error('Error in POST /api/affiliate/product-commissions:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove uma margem customizada (volta a usar a margem padrão)
 * Query params: product_id
 */
export async function DELETE(request) {
  try {
    const session = getAffiliateSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'ID do produto é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Serviço não configurado' },
        { status: 500 }
      );
    }

    const { error } = await supabase
      .from('affiliate_product_commissions')
      .delete()
      .eq('affiliate_id', session.affiliateId)
      .eq('product_id', parseInt(productId));

    if (error) {
      console.error('Error deleting custom commission:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao remover margem customizada' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Margem customizada removida. Usando margem padrão.',
    });
  } catch (error) {
    console.error('Error in DELETE /api/affiliate/product-commissions:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
