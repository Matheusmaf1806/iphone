import { headers } from 'next/headers';
import { createServerClient } from './supabase/server';
import { SITE_NAME } from './siteConfig';

/**
 * Obtém a configuração do afiliado baseado no domínio/hostname
 */
export async function getAffiliateConfig() {
  const headersList = headers();
  const host = headersList.get('host') || 'localhost:3000';

  const supabase = createServerClient();

  // Se Supabase não estiver configurado, retornar config padrão
  if (!supabase) {
    console.error('[getAffiliateConfig] Supabase client is null');
    return getDefaultConfig();
  }

  try {
    // Buscar afiliado pelo domínio, subdomínio ou domínio customizado
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('*')
      .or(`domain.eq.${host},subdomain.eq.${host},custom_domain.eq.${host}`)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[getAffiliateConfig] Domain query error:', error);
    }

    if (affiliate) {
      return mapAffiliateToConfig(affiliate);
    }

    // Se não encontrar por domínio, buscar o afiliado padrão (slug=default)
    const { data: defaultAffiliate, error: defaultError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('slug', 'default')
      .maybeSingle();

    if (defaultError) {
      console.error('[getAffiliateConfig] Default query error:', defaultError);
    }

    if (defaultAffiliate) {
      return mapAffiliateToConfig(defaultAffiliate);
    }

    console.error('[getAffiliateConfig] No affiliate found for host:', host);
    return getDefaultConfig();
  } catch (error) {
    console.error('[getAffiliateConfig] Unexpected error:', error);
    return getDefaultConfig();
  }
}

function getDefaultConfig() {
  return {
    affiliateId: 'default',
    name: SITE_NAME,
    logo: '',
    favicon: '',
    brandColor: '#0043f7',
    commissionRate: 0.10,
    commission_percentage: 10,
    instagram: '',
    whatsapp: '',
  };
}

/**
 * Mapeia os dados do banco para o formato esperado
 */
function mapAffiliateToConfig(affiliate) {
  return {
    affiliateId: String(affiliate.id),
    slug: affiliate.slug,
    name: affiliate.name,
    logo: affiliate.logo_url || '',
    favicon: affiliate.favicon_url || '',
    brandColor: affiliate.primary_color || '#0043f7',
    backgroundColor: affiliate.background_color,
    buttonColor: affiliate.button_color,
    buttonTextColor: affiliate.button_text_color,
    buttonHover: affiliate.button_hover,
    commissionRate: parseFloat(affiliate.commission_rate) || 10,
    commission_percentage: parseFloat(affiliate.commission_rate) || 10,
    cnpj: affiliate.cnpj,
    tax: affiliate.tax,
    domain: affiliate.domain,
    subdomain: affiliate.subdomain,
    instagram: affiliate.instagram_handle || '',
    whatsapp: affiliate.whatsapp_number || '',
  };
}

/**
 * Obtém afiliado por slug
 */
export async function getAffiliateBySlug(slug) {
  const supabase = createServerClient();

  const { data: affiliate, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !affiliate) {
    return null;
  }

  return mapAffiliateToConfig(affiliate);
}

/**
 * Obtém afiliado por ID
 */
export async function getAffiliateById(id) {
  const supabase = createServerClient();

  const { data: affiliate, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error || !affiliate) {
    return null;
  }

  return mapAffiliateToConfig(affiliate);
}

/**
 * Lista todos os afiliados ativos
 */
export async function getAllAffiliates() {
  const supabase = createServerClient();

  const { data: affiliates, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error || !affiliates) {
    return [];
  }

  return affiliates.map(mapAffiliateToConfig);
}

/**
 * Rastreia uma venda/conversão de afiliado
 */
export async function trackAffiliateSale(affiliateId, saleData) {
  const supabase = createServerClient();

  const { product_id, quantity, product_price, customer_email, order_id } = saleData;

  // Buscar taxa de comissão do afiliado
  const affiliate = await getAffiliateById(affiliateId);
  if (!affiliate) {
    console.error('Affiliate not found:', affiliateId);
    return { success: false, error: 'Affiliate not found' };
  }

  const totalAmount = product_price * quantity;
  const commissionAmount = calculateCommission(totalAmount, affiliate.commissionRate);

  const { data, error } = await supabase
    .from('affiliate_sales')
    .insert({
      affiliate_id: affiliateId,
      product_id,
      order_id,
      quantity,
      product_price,
      total_amount: totalAmount,
      commission_rate: affiliate.commissionRate,
      commission_amount: commissionAmount,
      customer_email,
      status: 'pending',
      tracking_id: `track_${Date.now()}_${affiliateId}`,
    })
    .select()
    .single();

  if (error) {
    console.error('Error tracking sale:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    trackingId: data.tracking_id,
    commissionAmount,
    saleId: data.id,
  };
}

/**
 * Obtém o ID do afiliado da URL (parâmetro ?ref=)
 */
export function getAffiliateFromUrl(searchParams) {
  return searchParams?.ref || null;
}

/**
 * Calcula a comissão do afiliado
 */
export function calculateCommission(amount, rate) {
  return amount * rate;
}

/**
 * Obtém estatísticas de vendas de um afiliado
 */
export async function getAffiliateSalesStats(affiliateId, startDate = null, endDate = null) {
  const supabase = createServerClient();

  let query = supabase
    .from('affiliate_sales')
    .select('*')
    .eq('affiliate_id', affiliateId);

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data: sales, error } = await query;

  if (error || !sales) {
    return {
      totalSales: 0,
      totalRevenue: 0,
      totalCommission: 0,
      pendingCommission: 0,
      paidCommission: 0,
    };
  }

  const stats = sales.reduce((acc, sale) => {
    acc.totalSales += 1;
    acc.totalRevenue += parseFloat(sale.total_amount);
    acc.totalCommission += parseFloat(sale.commission_amount);

    if (sale.status === 'pending') {
      acc.pendingCommission += parseFloat(sale.commission_amount);
    } else if (sale.status === 'paid') {
      acc.paidCommission += parseFloat(sale.commission_amount);
    }

    return acc;
  }, {
    totalSales: 0,
    totalRevenue: 0,
    totalCommission: 0,
    pendingCommission: 0,
    paidCommission: 0,
  });

  return stats;
}

/**
 * Cria ou atualiza um afiliado
 */
export async function upsertAffiliate(affiliateData) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('affiliates')
    .upsert(affiliateData)
    .select()
    .single();

  if (error) {
    console.error('Error upserting affiliate:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: mapAffiliateToConfig(data) };
}
