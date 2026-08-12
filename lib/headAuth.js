import { createServerClient } from './supabase/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

// Autenticação própria do Head (/head) — não é afiliado nem gestão. Login e
// permissões totalmente separados dos outros três sistemas (gestão, afiliado,
// loja), então um vazamento de sessão de Head nunca dá acesso a dados de
// outro sistema, e vice-versa.
const SESSION_COOKIE_NAME = 'head_session';
const SESSION_DURATION = 60 * 60 * 24 * 30; // 30 dias em segundos

export async function authenticateHead(username, password) {
  const supabase = createServerClient();
  if (!supabase) {
    return { success: false, error: 'Serviço de autenticação não configurado' };
  }

  const { data: user, error } = await supabase
    .from('head_users')
    .select('*, head:heads(id, name, slug, own_affiliate_id, commission_percentage, is_active)')
    .ilike('username', username)
    .eq('is_active', true)
    .single();

  if (error || !user || !user.head?.is_active) {
    return { success: false, error: 'Usuário ou senha inválidos' };
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return { success: false, error: 'Usuário ou senha inválidos' };
  }

  await supabase
    .from('head_users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', user.id);

  const session = {
    userId: user.id,
    username: user.username,
    fullName: user.full_name,
    headId: user.head.id,
    headName: user.head.name,
    headSlug: user.head.slug,
    ownAffiliateId: user.head.own_affiliate_id,
    commissionPercentage: user.head.commission_percentage,
    timestamp: Date.now(),
  };

  return { success: true, session };
}

export function createHeadSession(sessionData) {
  const cookieStore = cookies();
  const encodedSession = Buffer.from(JSON.stringify(sessionData)).toString('base64');
  cookieStore.set(SESSION_COOKIE_NAME, encodedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

export function getHeadSession() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie) return null;

  try {
    const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    if (Date.now() - session.timestamp > SESSION_DURATION * 1000) {
      destroyHeadSession();
      return null;
    }
    return session;
  } catch (error) {
    console.error('Error parsing head session:', error);
    return null;
  }
}

export function destroyHeadSession() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireHeadAuth() {
  const session = getHeadSession();
  if (!session) {
    return { authenticated: false, redirect: '/head/login' };
  }

  const supabase = createServerClient();
  if (!supabase) {
    destroyHeadSession();
    return { authenticated: false, redirect: '/head/login' };
  }

  const { data: user } = await supabase
    .from('head_users')
    .select('id, is_active, head:heads(is_active)')
    .eq('id', session.userId)
    .single();

  if (!user || !user.is_active || !user.head?.is_active) {
    destroyHeadSession();
    return { authenticated: false, redirect: '/head/login' };
  }

  return { authenticated: true, session };
}
