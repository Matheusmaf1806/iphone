import { createServerClient } from './supabase/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'customer_session';
const SESSION_DURATION = 60 * 60 * 24 * 30; // 30 dias em segundos

/**
 * Registra um novo usuário B2C
 */
export async function registerCustomer({ name, email, password, affiliateId = null }) {
  const supabase = createServerClient();

  if (!supabase) {
    return { success: false, error: 'Serviço de banco de dados não configurado' };
  }

  try {
    // Verificar se email já existe
    const { data: existing } = await supabase
      .from('user_ecommerce')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return { success: false, error: 'Este e-mail já está cadastrado' };
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Criar usuário vinculado ao afiliado da loja onde se cadastrou
    const insertData = {
      name,
      email,
      password_hash: passwordHash,
      is_active: true,
    };
    if (affiliateId && affiliateId !== 'default') {
      insertData.affiliate_id = parseInt(affiliateId, 10);
    }

    const { data: user, error } = await supabase
      .from('user_ecommerce')
      .insert(insertData)
      .select('id, name, email, affiliate_id, created_at')
      .single();

    if (error) {
      console.error('Error registering customer:', error);
      return { success: false, error: 'Erro ao criar conta' };
    }

    // Criar sessão
    const session = {
      userId: user.id,
      name: user.name,
      email: user.email,
      affiliateId: user.affiliate_id != null ? String(user.affiliate_id) : null,
      timestamp: Date.now(),
    };

    return { success: true, session, user };
  } catch (error) {
    console.error('Unexpected registration error:', error);
    return { success: false, error: 'Erro ao processar cadastro' };
  }
}

/**
 * Autentica um usuário B2C
 */
export async function authenticateCustomer(email, password, storeAffiliateId = null) {
  const supabase = createServerClient();

  if (!supabase) {
    return { success: false, error: 'Serviço de autenticação não configurado' };
  }

  try {
    const { data: user, error } = await supabase
      .from('user_ecommerce')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return { success: false, error: 'E-mail ou senha inválidos' };
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return { success: false, error: 'E-mail ou senha inválidos' };
    }

    // Se o usuário não tem affiliate_id, vincular ao afiliado da loja atual
    let resolvedAffiliateId = user.affiliate_id;
    if (resolvedAffiliateId == null && storeAffiliateId) {
      const numericId = parseInt(storeAffiliateId, 10);
      await supabase
        .from('user_ecommerce')
        .update({ affiliate_id: numericId })
        .eq('id', user.id);
      resolvedAffiliateId = numericId;
    }

    // Atualizar último login
    await supabase
      .from('user_ecommerce')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    const session = {
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      cpf: user.cpf,
      address_street: user.address_street,
      address_number: user.address_number,
      address_complement: user.address_complement,
      address_neighborhood: user.address_neighborhood,
      address_city: user.address_city,
      address_state: user.address_state,
      address_zipcode: user.address_zipcode,
      affiliateId: resolvedAffiliateId != null ? String(resolvedAffiliateId) : null,
      timestamp: Date.now(),
    };

    return { success: true, session };
  } catch (error) {
    console.error('Unexpected authentication error:', error);
    return { success: false, error: 'Erro ao processar autenticação' };
  }
}

/**
 * Cria cookie de sessão do cliente
 */
export function createCustomerSession(sessionData) {
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
 * Obtém sessão atual do cliente
 */
export function getCustomerSession() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return null;
  }

  try {
    const sessionString = Buffer.from(sessionCookie.value, 'base64').toString();
    const session = JSON.parse(sessionString);

    const sessionAge = Date.now() - session.timestamp;
    if (sessionAge > SESSION_DURATION * 1000) {
      destroyCustomerSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error parsing customer session:', error);
    return null;
  }
}

/**
 * Destrói sessão (logout)
 */
export function destroyCustomerSession() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
