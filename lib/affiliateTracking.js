import { headers } from 'next/headers';
import { createServerClient } from './supabase/server';
import { getUsdBrlRate } from './exchangeRate';

/**
 * Detecta o afiliado baseado no domínio atual
 * Exemplo: lojadoze.com.br → busca afiliado com custom_domain = 'lojadoze.com.br'
 */
export async function detectAffiliateByDomain() {
  const headersList = headers();
  const host = headersList.get('host') || '';

  // Se for localhost ou domínio principal, não há afiliado
  if (host.includes('localhost') || host.includes('vercel.app') || host === process.env.NEXT_PUBLIC_MAIN_DOMAIN) {
    return null;
  }

  const supabase = createServerClient();

  if (!supabase) {
    console.error('Supabase client not configured');
    return null;
  }

  try {
    // Buscar afiliado pelo domínio, subdomínio ou domínio customizado
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('id, slug, name, commission_rate, domain, subdomain, custom_domain')
      .or(`domain.eq.${host},subdomain.eq.${host},custom_domain.eq.${host}`)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching affiliate by domain:', error);
      return null;
    }

    if (!affiliate) {
      return null;
    }

    return {
      id: affiliate.id,
      slug: affiliate.slug,
      name: affiliate.name,
      commission_percentage: parseFloat(affiliate.commission_rate) || 10,
      custom_domain: affiliate.custom_domain || affiliate.domain,
    };
  } catch (error) {
    console.error('Error detecting affiliate:', error);
    return null;
  }
}

/**
 * Busca dados completos do afiliado pelo username
 */
export async function getAffiliateByUsername(username) {
  if (!username) return null;

  const supabase = createServerClient();

  if (!supabase) {
    console.error('Supabase client not configured');
    return null;
  }

  try {
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('id, slug, name, commission_rate, domain, subdomain, custom_domain')
      .eq('slug', username)
      .eq('is_active', true)
      .single();

    if (error || !affiliate) {
      console.error('Affiliate not found:', error);
      return null;
    }

    return {
      id: affiliate.id,
      slug: affiliate.slug,
      name: affiliate.name,
      commission_percentage: parseFloat(affiliate.commission_rate) || 10,
      custom_domain: affiliate.custom_domain || affiliate.domain,
    };
  } catch (error) {
    console.error('Error fetching affiliate:', error);
    return null;
  }
}

/**
 * Busca afiliado pelo ID
 */
export async function getAffiliateById(affiliateId) {
  if (!affiliateId) return null;

  const supabase = createServerClient();

  if (!supabase) {
    return null;
  }

  try {
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('id, slug, name, commission_rate, domain, subdomain, custom_domain')
      .eq('id', affiliateId)
      .eq('is_active', true)
      .single();

    if (error || !affiliate) {
      return null;
    }

    return {
      id: affiliate.id,
      slug: affiliate.slug,
      name: affiliate.name,
      commission_percentage: parseFloat(affiliate.commission_rate) || 10,
      custom_domain: affiliate.custom_domain || affiliate.domain,
    };
  } catch (error) {
    console.error('Error fetching affiliate by ID:', error);
    return null;
  }
}

/**
 * Obtém configurações da plataforma
 */
export async function getPlatformConfig() {
  const supabase = createServerClient();

  if (!supabase) {
    // Valores padrão se não tiver Supabase configurado
    return {
      cardFeePercentage: 9.68,
      pixDiscountPercentage: 5,
      defaultAffiliateMargin: 10,
      usdBrlRate: 5.5,
      defaultImportTaxPercentage: 0,
    };
  }

  try {
    const { data: configs } = await supabase
      .from('platform_config')
      .select('key, value')
      .in('key', [
        'card_fee_percentage',
        'pix_discount_percentage',
        'default_affiliate_margin',
        'usd_brl_rate',
        'default_import_tax_percentage',
      ]);

    const configObj = {};
    configs?.forEach(config => {
      configObj[config.key] = parseFloat(config.value);
    });

    // Cotação USD->BRL vem da PTAX do Banco Central + IOF + spread (ver
    // lib/exchangeRate.js) — o valor salvo em platform_config.usd_brl_rate agora
    // só é usado como fallback se a API do BCB estiver fora do ar.
    const usdBrlRate = await getUsdBrlRate(configObj.usd_brl_rate || 5.5);

    return {
      cardFeePercentage: configObj.card_fee_percentage || 9.68,
      pixDiscountPercentage: configObj.pix_discount_percentage || 5,
      defaultAffiliateMargin: configObj.default_affiliate_margin || 10,
      usdBrlRate,
      defaultImportTaxPercentage: configObj.default_import_tax_percentage || 0,
    };
  } catch (error) {
    console.error('Error fetching platform config:', error);
    return {
      cardFeePercentage: 9.68,
      pixDiscountPercentage: 5,
      defaultAffiliateMargin: 10,
      usdBrlRate: 5.5,
      defaultImportTaxPercentage: 0,
    };
  }
}

/**
 * Verifica se o domínio atual pertence a um afiliado
 */
export async function isAffiliateDomain() {
  const affiliate = await detectAffiliateByDomain();
  return affiliate !== null;
}

/**
 * Obtém informações do contexto atual (afiliado + configs)
 */
export async function getCurrentContext() {
  const affiliate = await detectAffiliateByDomain();
  const config = await getPlatformConfig();

  return {
    affiliate,
    config,
    isAffiliate: affiliate !== null,
  };
}
