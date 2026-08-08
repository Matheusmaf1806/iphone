import { NextResponse } from 'next/server';
import { createServerClient } from '../../../../lib/supabase/server';
import { getSession } from '../../../../lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// GET - List all admin users
export async function GET() {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 });
    }

    const { data: users, error } = await supabase
      .from('admin_users')
      .select('id, username, email, full_name, role, is_active, last_login, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AdminUsers] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error('[AdminUsers] Unexpected error:', error);
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}

// POST - Create new admin user
export async function POST(request) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Only super_admin can create users
    if (session.role !== 'super_admin' && session.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão para criar usuários' }, { status: 403 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 });
    }

    const body = await request.json();
    const { username, email, full_name, password, role } = body;

    if (!username || !email || !full_name || !password) {
      return NextResponse.json({ error: 'Campos obrigatórios: username, email, full_name, password' }, { status: 400 });
    }

    const allowedRoles = ['admin', 'editor', 'viewer'];
    const userRole = allowedRoles.includes(role) ? role : 'admin';

    const password_hash = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('admin_users')
      .insert({
        username,
        email,
        full_name,
        password_hash,
        role: userRole,
        is_active: true,
      })
      .select('id, username, email, full_name, role, is_active, created_at')
      .single();

    if (error) {
      console.error('[AdminUsers] Create error:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Username ou email já existe' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error('[AdminUsers] Unexpected error:', error);
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}

// PATCH - Update admin user
export async function PATCH(request) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (session.role !== 'super_admin' && session.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 });
    }

    const body = await request.json();
    const { userId, is_active, role, password } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    if (userId === session.id) {
      return NextResponse.json({ error: 'Não é possível editar a própria conta por aqui' }, { status: 400 });
    }

    const updates = {};
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (role && ['admin', 'editor', 'viewer'].includes(role)) updates.role = role;
    if (password) updates.password_hash = await bcrypt.hash(password, 10);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhuma alteração' }, { status: 400 });
    }

    const { error } = await supabase
      .from('admin_users')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('[AdminUsers] Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AdminUsers] Unexpected error:', error);
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}
