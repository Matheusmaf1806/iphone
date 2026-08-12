import { NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase/server';
import { getSession } from '../../../lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// GET - Lista todos os Heads
export async function GET() {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 });
    }

    const { data: heads, error } = await supabase
      .from('heads')
      .select('id, name, slug, own_affiliate_id, commission_percentage, is_active, created_at, own_affiliate:affiliates(id, name, slug)')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching heads:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, heads: heads || [] });
  } catch (error) {
    console.error('Heads GET error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Cria um novo Head + primeiro usuário (owner)
export async function POST(request) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name, slug, own_affiliate_id, commission_percentage,
      user_full_name, user_email, user_username, user_password,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }
    if (!user_full_name || !user_username || !user_password) {
      return NextResponse.json({ error: 'Dados do primeiro usuário são obrigatórios' }, { status: 400 });
    }
    if (user_password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres' }, { status: 400 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 });
    }

    const { data: existingUser } = await supabase
      .from('head_users')
      .select('username')
      .eq('username', user_username.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: 'Nome de usuário já está em uso' }, { status: 400 });
    }

    const cleanSlug = slug ? slug.toLowerCase().replace(/[^a-z0-9-]/g, '') : null;

    const { data: head, error: headError } = await supabase
      .from('heads')
      .insert({
        name,
        slug: cleanSlug || null,
        own_affiliate_id: own_affiliate_id || null,
        commission_percentage: commission_percentage ? parseFloat(commission_percentage) : 25.00,
        is_active: true,
      })
      .select()
      .single();

    if (headError) {
      console.error('Error creating head:', headError);
      if (headError.code === '23505') {
        return NextResponse.json({ error: 'Slug já está em uso' }, { status: 400 });
      }
      return NextResponse.json({ error: headError.message }, { status: 500 });
    }

    const passwordHash = await bcrypt.hash(user_password, 10);

    const { error: userError } = await supabase
      .from('head_users')
      .insert({
        head_id: head.id,
        username: user_username.toLowerCase(),
        email: user_email || null,
        password_hash: passwordHash,
        full_name: user_full_name,
        role: 'owner',
        is_active: true,
      });

    if (userError) {
      console.error('Error creating head user:', userError);
      const { error: rollbackError } = await supabase.from('heads').delete().eq('id', head.id);
      if (rollbackError) {
        console.error('Error rolling back head after user creation failure:', rollbackError);
        return NextResponse.json({
          error: `Erro ao criar usuário (${userError.message}) e também falhou ao desfazer o Head criado — peça pra alguém apagar manualmente o Head "${head.name}" (id ${head.id}) e tente de novo.`,
        }, { status: 500 });
      }
      return NextResponse.json({ error: 'Erro ao criar usuário: ' + userError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, head });
  } catch (error) {
    console.error('Heads POST error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PATCH - Atualiza um Head
export async function PATCH(request) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 });
    }

    const allowedFields = ['name', 'slug', 'own_affiliate_id', 'commission_percentage', 'is_active'];
    const sanitized = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitized[key] = updates[key];
      }
    }
    sanitized.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('heads')
      .update(sanitized)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating head:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, head: data });
  } catch (error) {
    console.error('Heads PATCH error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
