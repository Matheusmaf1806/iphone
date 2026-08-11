import { NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase/server';
import { requireAuth } from '../../../lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 });
  }

  const { data: users, error } = await supabase
    .from('store_users')
    .select('id, username, email, full_name, phone, pickup_location_id, is_active, last_login, created_at, pickup_location:pickup_locations(id, name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[StoreUsers] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: users || [] });
}

export async function POST(request) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 });
  }

  const body = await request.json();
  const { username, email, full_name, phone, password, pickup_location_id } = body;

  if (!username || !full_name || !password) {
    return NextResponse.json({ error: 'Campos obrigatórios: username, full_name, password' }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 10);

  const { data: newUser, error } = await supabase
    .from('store_users')
    .insert({
      username: username.trim().toLowerCase(),
      email: email || null,
      full_name,
      phone: phone || null,
      password_hash,
      pickup_location_id: pickup_location_id || null,
      is_active: true,
    })
    .select('id, username, email, full_name, phone, pickup_location_id, is_active, created_at')
    .single();

  if (error) {
    console.error('[StoreUsers] Create error:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username já existe' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, user: newUser });
}

export async function PATCH(request) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 });
  }

  const body = await request.json();
  const { userId, is_active, pickup_location_id, password } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
  }

  const updates = {};
  if (is_active !== undefined) updates.is_active = is_active;
  if (pickup_location_id !== undefined) updates.pickup_location_id = pickup_location_id || null;
  if (password) updates.password_hash = await bcrypt.hash(password, 10);

  const { error } = await supabase
    .from('store_users')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.error('[StoreUsers] Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
