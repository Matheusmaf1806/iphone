import { createServerClient } from './supabase/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 dias em segundos

/**
 * Autentica um usuário admin
 */
export async function authenticateAdmin(username, password) {
  const supabase = createServerClient();

  if (!supabase) {
    console.error('Supabase client not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
    return { success: false, error: 'Serviço de autenticação não configurado' };
  }

  // Buscar usuário
  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('username', username)
    .eq('is_active', true)
    .single();

  if (error || !admin) {
    console.error('Admin user query error:', error);
    return { success: false, error: 'Usuário ou senha inválidos' };
  }

  // Verificar senha
  const passwordMatch = await bcrypt.compare(password, admin.password_hash);

  if (!passwordMatch) {
    return { success: false, error: 'Usuário ou senha inválidos' };
  }

  // Atualizar último login
  await supabase
    .from('admin_users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', admin.id);

  // Criar sessão
  const session = {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    fullName: admin.full_name,
    role: admin.role,
    timestamp: Date.now(),
  };

  return { success: true, session };
}

/**
 * Cria um cookie de sessão
 */
export function createSession(sessionData) {
  const cookieStore = cookies();
  const sessionString = JSON.stringify(sessionData);
  const encodedSession = Buffer.from(sessionString).toString('base64');

  cookieStore.set(SESSION_COOKIE_NAME, encodedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/', // Cookie disponível em todo o site, incluindo /api
  });
}

/**
 * Obtém a sessão atual
 */
export function getSession() {
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
      destroySession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error parsing session:', error);
    return null;
  }
}

/**
 * Verifica se o usuário está autenticado
 */
export function isAuthenticated() {
  return getSession() !== null;
}

/**
 * Destrói a sessão (logout)
 */
export function destroySession() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Middleware para proteger rotas
 */
export async function requireAuth() {
  const session = getSession();
  console.log('[requireAuth] Session found:', session ? `User: ${session.username}` : 'No session');

  if (!session) {
    console.log('[requireAuth] No session cookie found');
    return {
      authenticated: false,
      redirect: '/gestao/login',
    };
  }

  // Verificar se o usuário ainda existe e está ativo
  const supabase = createServerClient();

  if (!supabase) {
    console.error('[requireAuth] Supabase client not configured');
    destroySession();
    return {
      authenticated: false,
      redirect: '/gestao/login',
    };
  }

  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('id, is_active')
    .eq('id', session.id)
    .single();

  if (error) {
    console.error('[requireAuth] Error fetching admin user:', error);
  }

  if (!admin || !admin.is_active) {
    console.log('[requireAuth] Admin not found or inactive');
    destroySession();
    return {
      authenticated: false,
      redirect: '/gestao/login',
    };
  }

  console.log('[requireAuth] Authentication successful for user:', session.username);
  return {
    authenticated: true,
    session,
  };
}

/**
 * Cria um novo usuário admin (para uso em seed/migration)
 */
export async function createAdminUser(userData) {
  const supabase = createServerClient();

  if (!supabase) {
    console.error('Supabase client not configured');
    return { success: false, error: 'Serviço de banco de dados não configurado' };
  }

  // Hash da senha
  const passwordHash = await bcrypt.hash(userData.password, 10);

  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      username: userData.username,
      email: userData.email,
      password_hash: passwordHash,
      full_name: userData.fullName,
      role: userData.role || 'admin',
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating admin user:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Atualiza senha do admin
 */
export async function updateAdminPassword(adminId, newPassword) {
  const supabase = createServerClient();

  if (!supabase) {
    console.error('Supabase client not configured');
    return { success: false, error: 'Serviço de banco de dados não configurado' };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const { error } = await supabase
    .from('admin_users')
    .update({ password_hash: passwordHash })
    .eq('id', adminId);

  if (error) {
    console.error('Error updating password:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
