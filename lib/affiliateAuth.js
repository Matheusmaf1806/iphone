import { createServerClient } from './supabase/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'affiliate_session';
const SESSION_DURATION = 60 * 60 * 24 * 30; // 30 dias em segundos

/**
 * Autentica um usuário de afiliado
 */
export async function authenticateAffiliate(username, password) {
  const supabase = createServerClient();

  if (!supabase) {
    console.error('Supabase client not configured');
    return { success: false, error: 'Serviço de autenticação não configurado' };
  }

  try {
    // Passo 1: Buscar usuário — comparação case-insensitive, porque o cadastro
    // (POST /api/affiliates) sempre salva o username em minúsculo, mas aqui no login
    // a pessoa pode digitar com maiúsculas sem perceber.
    const { data: user, error: userError } = await supabase
      .from('affiliate_users')
      .select('*')
      .ilike('username', username)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      console.error('Affiliate user query error:', userError);
      return { success: false, error: 'Usuário ou senha inválidos' };
    }

    // Passo 2: Buscar dados do afiliado
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, slug, name, domain, subdomain, logo_url, primary_color, commission_rate, is_active')
      .eq('id', user.affiliate_id)
      .single();

    if (affiliateError || !affiliate) {
      console.error('Affiliate query error:', affiliateError);
      return { success: false, error: 'Erro ao carregar dados do afiliado' };
    }

    // Verificar se o afiliado está ativo
    if (!affiliate.is_active) {
      return { success: false, error: 'Afiliado inativo' };
    }

    // Passo 3: Verificar senha
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return { success: false, error: 'Usuário ou senha inválidos' };
    }

    // Passo 4: Atualizar último login
    await supabase
      .from('affiliate_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Passo 5: Criar sessão com dados do usuário E do afiliado
    const session = {
      userId: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      profilePhotoUrl: user.profile_photo_url || null,
      affiliateId: affiliate.id,
      affiliateSlug: affiliate.slug,
      affiliateName: affiliate.name,
      affiliateLogoUrl: affiliate.logo_url || null,
      commissionPercentage: affiliate.commission_rate,
      timestamp: Date.now(),
    };

    return { success: true, session };
  } catch (error) {
    console.error('Unexpected authentication error:', error);
    return { success: false, error: 'Erro ao processar autenticação' };
  }
}

/**
 * Cria um cookie de sessão
 */
export function createAffiliateSession(sessionData) {
  const cookieStore = cookies();
  const sessionString = JSON.stringify(sessionData);
  const encodedSession = Buffer.from(sessionString).toString('base64');

  cookieStore.set(SESSION_COOKIE_NAME, encodedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

/**
 * Obtém a sessão atual do afiliado
 */
export function getAffiliateSession() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return null;
  }

  try {
    const sessionString = Buffer.from(sessionCookie.value, 'base64').toString();
    const session = JSON.parse(sessionString);

    // Verificar se a sessão não expirou
    const sessionAge = Date.now() - session.timestamp;
    if (sessionAge > SESSION_DURATION * 1000) {
      destroyAffiliateSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error parsing affiliate session:', error);
    return null;
  }
}

/**
 * Verifica se o afiliado está autenticado
 */
export function isAffiliateAuthenticated() {
  return getAffiliateSession() !== null;
}

/**
 * Destrói a sessão (logout)
 */
export function destroyAffiliateSession() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Middleware para proteger rotas do afiliado
 */
export async function requireAffiliateAuth() {
  const session = getAffiliateSession();

  if (!session) {
    return {
      authenticated: false,
      redirect: '/afiliado/login',
    };
  }

  // Verificar se o usuário ainda existe e está ativo
  const supabase = createServerClient();

  if (!supabase) {
    console.error('Supabase client not configured');
    destroyAffiliateSession();
    return {
      authenticated: false,
      redirect: '/afiliado/login',
    };
  }

  try {
    // Buscar usuário
    const { data: user } = await supabase
      .from('affiliate_users')
      .select('id, is_active, affiliate_id')
      .eq('id', session.userId)
      .single();

    if (!user || !user.is_active) {
      destroyAffiliateSession();
      return {
        authenticated: false,
        redirect: '/afiliado/login',
      };
    }

    // Buscar afiliado
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, is_active')
      .eq('id', user.affiliate_id)
      .single();

    if (!affiliate || !affiliate.is_active) {
      destroyAffiliateSession();
      return {
        authenticated: false,
        redirect: '/afiliado/login',
      };
    }

    return {
      authenticated: true,
      session,
    };
  } catch (error) {
    console.error('Error in requireAffiliateAuth:', error);
    destroyAffiliateSession();
    return {
      authenticated: false,
      redirect: '/afiliado/login',
    };
  }
}

/**
 * Cria um novo afiliado com primeiro usuário (dono)
 */
export async function createAffiliate(affiliateData) {
  const supabase = createServerClient();

  if (!supabase) {
    console.error('Supabase client not configured');
    return { success: false, error: 'Serviço de banco de dados não configurado' };
  }

  // Verificar se username ou email já existem
  const { data: existingUser } = await supabase
    .from('affiliate_users')
    .select('username, email')
    .or(`username.eq.${affiliateData.username},email.eq.${affiliateData.email}`)
    .single();

  if (existingUser) {
    if (existingUser.username === affiliateData.username) {
      return { success: false, error: 'Nome de usuário já está em uso' };
    }
    if (existingUser.email === affiliateData.email) {
      return { success: false, error: 'Email já está cadastrado' };
    }
  }

  // 1. Criar o afiliado (marca/empresa)
  const { data: affiliate, error: affiliateError } = await supabase
    .from('affiliates')
    .insert({
      slug: affiliateData.slug || affiliateData.username,
      name: affiliateData.businessName || affiliateData.fullName,
      domain: null, // Será configurado depois
      subdomain: affiliateData.slug || affiliateData.username,
      logo_url: null,
      primary_color: '#0043f7', // Cor padrão
      commission_rate: affiliateData.commissionPercentage || 10.00,
      is_active: true,
    })
    .select()
    .single();

  if (affiliateError) {
    console.error('Error creating affiliate:', affiliateError);
    return { success: false, error: 'Erro ao criar afiliado' };
  }

  // 2. Hash da senha
  const passwordHash = await bcrypt.hash(affiliateData.password, 10);

  // 3. Criar o primeiro usuário (dono) do afiliado
  const { data: user, error: userError } = await supabase
    .from('affiliate_users')
    .insert({
      affiliate_id: affiliate.id,
      username: affiliateData.username,
      email: affiliateData.email,
      password_hash: passwordHash,
      full_name: affiliateData.fullName,
      cpf: affiliateData.cpf,
      phone: affiliateData.phone,
      role: 'owner', // Primeiro usuário é sempre owner
      is_active: true,
      email_verified: false,
    })
    .select()
    .single();

  if (userError) {
    console.error('Error creating affiliate user:', userError);
    // Reverter criação do afiliado
    await supabase.from('affiliates').delete().eq('id', affiliate.id);
    return { success: false, error: 'Erro ao criar usuário do afiliado' };
  }

  return { success: true, data: { affiliate, user } };
}

/**
 * Atualiza dados do afiliado
 */
export async function updateAffiliate(affiliateId, updateData) {
  const supabase = createServerClient();

  if (!supabase) {
    console.error('Supabase client not configured');
    return { success: false, error: 'Serviço de banco de dados não configurado' };
  }

  const { error } = await supabase
    .from('affiliates')
    .update(updateData)
    .eq('id', affiliateId);

  if (error) {
    console.error('Error updating affiliate:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Atualiza senha do afiliado
 */
export async function updateAffiliatePassword(affiliateId, newPassword) {
  const supabase = createServerClient();

  if (!supabase) {
    console.error('Supabase client not configured');
    return { success: false, error: 'Serviço de banco de dados não configurado' };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const { error } = await supabase
    .from('affiliates')
    .update({ password_hash: passwordHash })
    .eq('id', affiliateId);

  if (error) {
    console.error('Error updating password:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Obtém dados completos do afiliado
 */
export async function getAffiliateData(affiliateId) {
  const supabase = createServerClient();

  if (!supabase) {
    return { success: false, error: 'Serviço de banco de dados não configurado' };
  }

  const { data, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq('id', affiliateId)
    .single();

  if (error) {
    console.error('Error fetching affiliate data:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}
