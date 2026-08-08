import { NextResponse } from 'next/server';
import { createServerClient } from '../../../../lib/supabase/server';
import { getAffiliateSession } from '../../../../lib/affiliateAuth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// GET - List users for this affiliate
export async function GET() {
  try {
    const session = getAffiliateSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 });
    }

    const { data: users, error } = await supabase
      .from('affiliate_users')
      .select('id, username, email, full_name, phone, role, is_active, last_login, created_at')
      .eq('affiliate_id', session.affiliateId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AffiliateUsers] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error('[AffiliateUsers] Unexpected error:', error);
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}

// POST - Create new user for this affiliate
export async function POST(request) {
  try {
    const session = getAffiliateSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Only owner/admin can create users
    if (session.role !== 'owner' && session.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão para criar usuários' }, { status: 403 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 });
    }

    const body = await request.json();
    const { username, email, full_name, phone, password, role } = body;

    if (!username || !email || !full_name || !password) {
      return NextResponse.json({ error: 'Campos obrigatórios: username, email, full_name, password' }, { status: 400 });
    }

    // Validate role
    const allowedRoles = ['admin', 'editor', 'viewer'];
    const userRole = allowedRoles.includes(role) ? role : 'viewer';

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('affiliate_users')
      .insert({
        affiliate_id: session.affiliateId,
        username,
        email,
        full_name,
        phone: phone || null,
        password_hash,
        role: userRole,
        is_active: true,
      })
      .select('id, username, email, full_name, phone, role, is_active, created_at')
      .single();

    if (error) {
      console.error('[AffiliateUsers] Create error:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Username ou email já existe' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error('[AffiliateUsers] Unexpected error:', error);
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}

// PATCH - Update user (toggle active, change role)
export async function PATCH(request) {
  try {
    const session = getAffiliateSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (session.role !== 'owner' && session.role !== 'admin') {
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

    // Don't allow editing yourself
    if (userId === session.userId) {
      return NextResponse.json({ error: 'Use a página de configurações para editar sua conta' }, { status: 400 });
    }

    const updates = {};
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (role && ['admin', 'editor', 'viewer'].includes(role)) updates.role = role;
    if (password) updates.password_hash = await bcrypt.hash(password, 10);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhuma alteração' }, { status: 400 });
    }

    const { error } = await supabase
      .from('affiliate_users')
      .update(updates)
      .eq('id', userId)
      .eq('affiliate_id', session.affiliateId);

    if (error) {
      console.error('[AffiliateUsers] Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AffiliateUsers] Unexpected error:', error);
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}
