import { NextResponse } from 'next/server';
import { getAffiliateSession } from '../../../../lib/affiliateAuth';
import { createCoupon, updateCoupon, deleteCoupon, listCoupons } from '../../../../lib/coupons';
import { supabase } from '../../../../lib/supabase/client';

// GET - Listar cupons do afiliado
export async function GET(request) {
  try {
    const session = await getAffiliateSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Buscar cupons criados pelo afiliado
    const { coupons, success, error } = await listCoupons({
      created_by_type: 'affiliate',
      created_by_id: session.userId,
      affiliate_id: session.affiliateId
    });

    if (!success) {
      return NextResponse.json(
        { error: error || 'Erro ao buscar cupons' },
        { status: 500 }
      );
    }

    // Buscar estatísticas de uso de cada cupom
    const couponsWithStats = await Promise.all(
      coupons.map(async (coupon) => {
        const { data: usageStats } = await supabase
          .from('coupon_usage')
          .select('discount_amount')
          .eq('coupon_id', coupon.id);

        const totalDiscount = usageStats?.reduce((sum, usage) => sum + parseFloat(usage.discount_amount), 0) || 0;

        return {
          ...coupon,
          total_discount_given: totalDiscount
        };
      })
    );

    return NextResponse.json({ coupons: couponsWithStats });

  } catch (error) {
    console.error('Erro ao listar cupons do afiliado:', error);
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

// POST - Criar novo cupom
export async function POST(request) {
  try {
    const session = await getAffiliateSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      code,
      discount_percentage,
      valid_until,
      usage_limit,
      min_order_value
    } = body;

    // Validações
    if (!code || !discount_percentage) {
      return NextResponse.json(
        { error: 'Código e porcentagem de desconto são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar a margem do afiliado para validar o desconto
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('commission_rate')
      .eq('id', session.affiliateId)
      .single();

    const affiliateMargin = affiliate?.commission_rate || 0;

    // Validar se o desconto não excede a margem do afiliado
    if (discount_percentage > affiliateMargin) {
      return NextResponse.json(
        {
          error: `Desconto não pode exceder sua margem de ${affiliateMargin}%`,
          max_discount: affiliateMargin
        },
        { status: 400 }
      );
    }

    // Criar cupom
    const result = await createCoupon({
      code,
      discount_percentage,
      discount_source: 'affiliate', // Desconto vem da margem do afiliado
      created_by_type: 'affiliate',
      created_by_id: session.userId,
      affiliate_id: session.affiliateId,
      valid_until: valid_until || null,
      usage_limit: usage_limit || null,
      min_order_value: min_order_value || 0
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      coupon: result.coupon
    });

  } catch (error) {
    console.error('Erro ao criar cupom:', error);
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar cupom
export async function PUT(request) {
  try {
    const session = await getAffiliateSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do cupom é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o cupom pertence ao afiliado
    const { data: existingCoupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', id)
      .eq('created_by_id', session.userId)
      .eq('created_by_type', 'affiliate')
      .single();

    if (!existingCoupon) {
      return NextResponse.json(
        { error: 'Cupom não encontrado ou sem permissão' },
        { status: 404 }
      );
    }

    // Se estiver alterando o desconto, validar
    if (updateData.discount_percentage) {
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('commission_rate')
        .eq('id', session.affiliateId)
        .single();

      const affiliateMargin = affiliate?.commission_rate || 0;

      if (updateData.discount_percentage > affiliateMargin) {
        return NextResponse.json(
          {
            error: `Desconto não pode exceder sua margem de ${affiliateMargin}%`,
            max_discount: affiliateMargin
          },
          { status: 400 }
        );
      }
    }

    // Atualizar cupom
    const result = await updateCoupon(id, updateData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      coupon: result.coupon
    });

  } catch (error) {
    console.error('Erro ao atualizar cupom:', error);
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

// DELETE - Deletar cupom
export async function DELETE(request) {
  try {
    const session = await getAffiliateSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const couponId = searchParams.get('id');

    if (!couponId) {
      return NextResponse.json(
        { error: 'ID do cupom é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o cupom pertence ao afiliado
    const { data: existingCoupon } = await supabase
      .from('coupons')
      .select('id')
      .eq('id', couponId)
      .eq('created_by_id', session.userId)
      .eq('created_by_type', 'affiliate')
      .single();

    if (!existingCoupon) {
      return NextResponse.json(
        { error: 'Cupom não encontrado ou sem permissão' },
        { status: 404 }
      );
    }

    // Deletar cupom
    const result = await deleteCoupon(couponId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro ao deletar cupom:', error);
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
