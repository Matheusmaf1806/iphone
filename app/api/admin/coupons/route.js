import { NextResponse } from 'next/server';
import { getAdminSession } from '../../../../lib/auth';
import { createCoupon, updateCoupon, deleteCoupon, listCoupons } from '../../../../lib/coupons';
import { supabase } from '../../../../lib/supabase/client';

// GET - Listar cupons do admin
export async function GET(request) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const affiliateId = searchParams.get('affiliate_id');

    // Buscar cupons criados pelo admin
    const filters = {
      created_by_type: 'admin',
      created_by_id: session.id
    };

    // Se especificou afiliado, filtrar por ele
    if (affiliateId) {
      filters.affiliate_id = affiliateId;
    }

    const { coupons, success, error } = await listCoupons(filters);

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

        // Se houver affiliate_id, buscar nome do afiliado
        let affiliateName = null;
        if (coupon.affiliate_id) {
          const { data: affiliate } = await supabase
            .from('affiliates')
            .select('name')
            .eq('id', coupon.affiliate_id)
            .single();
          affiliateName = affiliate?.name;
        }

        return {
          ...coupon,
          total_discount_given: totalDiscount,
          affiliate_name: affiliateName
        };
      })
    );

    return NextResponse.json({ coupons: couponsWithStats });

  } catch (error) {
    console.error('Erro ao listar cupons do admin:', error);
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

// POST - Criar novo cupom
export async function POST(request) {
  try {
    const session = await getAdminSession();

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
      affiliate_id,
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

    // Se for para um afiliado específico, buscar margem do supplier para aquele produto
    // Para simplificar, vamos usar uma margem média/padrão
    // Na prática, a validação do desconto máximo acontece no momento da aplicação do cupom

    let maxDiscount = 100; // Admin pode dar até 100% de desconto da sua margem

    // Se especificou afiliado, validar que o afiliado existe
    if (affiliate_id) {
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('id', affiliate_id)
        .single();

      if (!affiliate) {
        return NextResponse.json(
          { error: 'Afiliado não encontrado' },
          { status: 404 }
        );
      }
    }

    if (discount_percentage > maxDiscount) {
      return NextResponse.json(
        {
          error: `Desconto não pode exceder ${maxDiscount}%`,
          max_discount: maxDiscount
        },
        { status: 400 }
      );
    }

    // Criar cupom
    const result = await createCoupon({
      code,
      discount_percentage,
      discount_source: 'admin', // Desconto vem da margem do admin
      created_by_type: 'admin',
      created_by_id: session.id,
      affiliate_id: affiliate_id || null, // Pode ser global (null) ou específico de afiliado
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
    const session = await getAdminSession();

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

    // Verificar se o cupom pertence ao admin
    const { data: existingCoupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', id)
      .eq('created_by_id', session.id)
      .eq('created_by_type', 'admin')
      .single();

    if (!existingCoupon) {
      return NextResponse.json(
        { error: 'Cupom não encontrado ou sem permissão' },
        { status: 404 }
      );
    }

    // Validar desconto se estiver sendo alterado
    if (updateData.discount_percentage && updateData.discount_percentage > 100) {
      return NextResponse.json(
        {
          error: 'Desconto não pode exceder 100%',
          max_discount: 100
        },
        { status: 400 }
      );
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
    const session = await getAdminSession();

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

    // Verificar se o cupom pertence ao admin
    const { data: existingCoupon } = await supabase
      .from('coupons')
      .select('id')
      .eq('id', couponId)
      .eq('created_by_id', session.id)
      .eq('created_by_type', 'admin')
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
