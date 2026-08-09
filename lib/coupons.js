import { supabase } from './supabase/client';

/**
 * Valida e retorna dados do cupom
 * @param {string} code - Código do cupom
 * @param {string} affiliateId - ID do afiliado (opcional)
 * @param {number} orderTotal - Total do pedido
 * @returns {Object} - { valid, coupon, error }
 */
export async function validateCoupon(code, affiliateId = null, orderTotal = 0) {
  try {
    // Buscar cupom
    let query = supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    const { data: coupon, error } = await query;

    if (error || !coupon) {
      return {
        valid: false,
        error: 'Cupom não encontrado ou inválido'
      };
    }

    // Validar afiliado (se o cupom for específico de um afiliado)
    if (coupon.affiliate_id && coupon.affiliate_id !== affiliateId) {
      return {
        valid: false,
        error: 'Cupom não válido para este afiliado'
      };
    }

    // Validar data de validade
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return {
        valid: false,
        error: 'Cupom ainda não está válido'
      };
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return {
        valid: false,
        error: 'Cupom expirado'
      };
    }

    // Validar limite de uso
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return {
        valid: false,
        error: 'Cupom atingiu o limite de uso'
      };
    }

    // Validar valor mínimo do pedido
    if (coupon.min_order_value && orderTotal < coupon.min_order_value) {
      return {
        valid: false,
        error: `Valor mínimo do pedido: R$ ${coupon.min_order_value.toFixed(2)}`
      };
    }

    return {
      valid: true,
      coupon
    };
  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    return {
      valid: false,
      error: 'Erro ao validar cupom'
    };
  }
}

/**
 * Aplica o desconto do cupom no preço
 * @param {Object} coupon - Dados do cupom
 * @param {Object} prices - Preços calculados { netPrice, pixPrice, finalPrice }
 * @param {number} supplierMarginPercentage - Margem do supplier/admin
 * @param {number} affiliateMarginPercentage - Margem do afiliado
 * @returns {Object} - { discountedPrices, discountAmount, discountDetails }
 */
export function applyCouponDiscount(coupon, prices, supplierMarginPercentage, affiliateMarginPercentage, cardFeePercentage = 9.68) {
  const { netPrice, pixPrice, finalPrice } = prices;
  const discountPercentage = coupon.discount_percentage;

  let newNetPrice = netPrice;
  let newPixPrice = pixPrice;
  let newFinalPrice = finalPrice;
  let discountAmount = 0;
  let discountDetails = {};

  if (coupon.discount_source === 'admin') {
    // Desconto vem da margem do admin/supplier
    // Reduzir apenas a margem do supplier, mantendo afiliado e custos

    // Calcular o valor da margem do supplier
    const supplierMargin = netPrice / (1 + supplierMarginPercentage / 100) * (supplierMarginPercentage / 100);

    // Calcular o desconto máximo possível (toda a margem do supplier)
    const maxDiscountPercentage = (supplierMargin / netPrice) * 100;

    // Se o desconto solicitado for maior que a margem disponível, limitar
    const effectiveDiscount = Math.min(discountPercentage, maxDiscountPercentage);

    // Calcular novo netPrice (base + margem reduzida)
    discountAmount = netPrice * (effectiveDiscount / 100);
    newNetPrice = netPrice - discountAmount;

    // Recalcular preços mantendo a margem do afiliado
    newPixPrice = newNetPrice * (1 + affiliateMarginPercentage / 100);

    // Calcular final price (com taxa de cartão)
    newFinalPrice = newPixPrice * (1 + cardFeePercentage / 100);

    discountDetails = {
      source: 'admin',
      maxAvailable: maxDiscountPercentage,
      applied: effectiveDiscount,
      limited: effectiveDiscount < discountPercentage
    };

  } else if (coupon.discount_source === 'affiliate') {
    // Desconto vem da margem do afiliado
    // Reduzir apenas a margem do afiliado, mantendo admin e custos

    // Calcular o valor da margem do afiliado
    const affiliateMargin = pixPrice - netPrice;

    // Calcular o desconto máximo possível (toda a margem do afiliado)
    const maxDiscountPercentage = (affiliateMargin / pixPrice) * 100;

    // Se o desconto solicitado for maior que a margem disponível, limitar
    const effectiveDiscount = Math.min(discountPercentage, maxDiscountPercentage);

    // Calcular novo pixPrice (netPrice + margem reduzida)
    discountAmount = pixPrice * (effectiveDiscount / 100);
    newPixPrice = pixPrice - discountAmount;

    // NetPrice permanece o mesmo (não afeta a margem do admin)
    newNetPrice = netPrice;

    // Recalcular final price (com taxa de cartão)
    newFinalPrice = newPixPrice * (1 + cardFeePercentage / 100);

    discountDetails = {
      source: 'affiliate',
      maxAvailable: maxDiscountPercentage,
      applied: effectiveDiscount,
      limited: effectiveDiscount < discountPercentage
    };
  }

  return {
    discountedPrices: {
      netPrice: newNetPrice,
      pixPrice: newPixPrice,
      finalPrice: newFinalPrice
    },
    discountAmount,
    discountDetails
  };
}

/**
 * Registra o uso do cupom
 * @param {string} couponId - ID do cupom
 * @param {string} orderId - ID do pedido
 * @param {number} discountAmount - Valor do desconto aplicado
 */
export async function registerCouponUsage(couponId, orderId, discountAmount) {
  try {
    // Registrar uso
    const { error: usageError } = await supabase
      .from('coupon_usage')
      .insert({
        coupon_id: couponId,
        order_id: orderId,
        discount_amount: discountAmount
      });

    if (usageError) throw usageError;

    // Incrementar contador de uso do cupom
    const { error: updateError } = await supabase.rpc('increment_coupon_usage', {
      coupon_id: couponId
    });

    // Se a função RPC não existir, fazer update manual
    if (updateError && updateError.code === '42883') {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('usage_count')
        .eq('id', couponId)
        .single();

      await supabase
        .from('coupons')
        .update({ usage_count: (coupon?.usage_count || 0) + 1 })
        .eq('id', couponId);
    } else if (updateError) {
      throw updateError;
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao registrar uso do cupom:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cria um novo cupom
 * @param {Object} couponData - Dados do cupom
 * @returns {Object} - { success, coupon, error }
 */
export async function createCoupon(couponData) {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        code: couponData.code.toUpperCase(),
        discount_percentage: couponData.discount_percentage,
        discount_source: couponData.discount_source,
        created_by_type: couponData.created_by_type,
        created_by_id: couponData.created_by_id,
        affiliate_id: couponData.affiliate_id || null,
        valid_from: couponData.valid_from || new Date().toISOString(),
        valid_until: couponData.valid_until || null,
        usage_limit: couponData.usage_limit || null,
        min_order_value: couponData.min_order_value || 0,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return {
          success: false,
          error: 'Código de cupom já existe'
        };
      }
      throw error;
    }

    return {
      success: true,
      coupon: data
    };
  } catch (error) {
    console.error('Erro ao criar cupom:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Atualiza um cupom existente
 * @param {string} couponId - ID do cupom
 * @param {Object} updateData - Dados para atualizar
 * @returns {Object} - { success, coupon, error }
 */
export async function updateCoupon(couponId, updateData) {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .update(updateData)
      .eq('id', couponId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      coupon: data
    };
  } catch (error) {
    console.error('Erro ao atualizar cupom:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Deleta um cupom
 * @param {string} couponId - ID do cupom
 * @returns {Object} - { success, error }
 */
export async function deleteCoupon(couponId) {
  try {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', couponId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar cupom:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Lista cupons com filtros
 * @param {Object} filters - Filtros opcionais
 * @returns {Array} - Lista de cupons
 */
export async function listCoupons(filters = {}) {
  try {
    let query = supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.affiliate_id) {
      query = query.eq('affiliate_id', filters.affiliate_id);
    }

    if (filters.created_by_type) {
      query = query.eq('created_by_type', filters.created_by_type);
    }

    if (filters.created_by_id) {
      query = query.eq('created_by_id', filters.created_by_id);
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      coupons: data
    };
  } catch (error) {
    console.error('Erro ao listar cupons:', error);
    return {
      success: false,
      error: error.message,
      coupons: []
    };
  }
}
