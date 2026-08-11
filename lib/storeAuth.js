import { createServerClient } from './supabase/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

// Autenticação própria do balcão de retirada (/loja) — não é afiliado nem gestão,
// é só quem confirma a entrega física do aparelho. Login e permissões totalmente
// separados dos outros dois sistemas, então um vazamento de sessão de balcão nunca
// dá acesso a dados de afiliado/plataforma, e vice-versa.
const SESSION_COOKIE_NAME = 'store_session';
const SESSION_DURATION = 60 * 60 * 24 * 30; // 30 dias em segundos

export async function authenticateStore(username, password) {
  const supabase = createServerClient();
  if (!supabase) {
    return { success: false, error: 'Serviço de autenticação não configurado' };
  }

  const { data: user, error } = await supabase
    .from('store_users')
    .select('*, pickup_location:pickup_locations(id, name)')
    .ilike('username', username)
    .eq('is_active', true)
    .single();

  if (error || !user) {
    return { success: false, error: 'Usuário ou senha inválidos' };
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return { success: false, error: 'Usuário ou senha inválidos' };
  }

  await supabase
    .from('store_users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', user.id);

  const session = {
    userId: user.id,
    username: user.username,
    fullName: user.full_name,
    pickupLocationId: user.pickup_location_id,
    pickupLocationName: user.pickup_location?.name || null,
    timestamp: Date.now(),
  };

  return { success: true, session };
}

export function createStoreSession(sessionData) {
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

export function getStoreSession() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie) return null;

  try {
    const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    if (Date.now() - session.timestamp > SESSION_DURATION * 1000) {
      destroyStoreSession();
      return null;
    }
    return session;
  } catch (error) {
    console.error('Error parsing store session:', error);
    return null;
  }
}

export function destroyStoreSession() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireStoreAuth() {
  const session = getStoreSession();
  if (!session) {
    return { authenticated: false, redirect: '/loja/login' };
  }

  const supabase = createServerClient();
  if (!supabase) {
    destroyStoreSession();
    return { authenticated: false, redirect: '/loja/login' };
  }

  const { data: user } = await supabase
    .from('store_users')
    .select('id, is_active')
    .eq('id', session.userId)
    .single();

  if (!user || !user.is_active) {
    destroyStoreSession();
    return { authenticated: false, redirect: '/loja/login' };
  }

  return { authenticated: true, session };
}
