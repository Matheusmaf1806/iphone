import { NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase/server';
import { getSession } from '../../../lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// GET - List all affiliates
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

    const { data: affiliates, error } = await supabase
      .from('affiliates')
      .select('id, name, slug, domain, subdomain, custom_domain, commission_rate, is_active, cnpj, logo_url, created_at')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching affiliates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, affiliates: affiliates || [] });
  } catch (error) {
    console.error('Affiliates GET error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Create new affiliate with visual identity and first user (owner)
export async function POST(request) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name, slug, domain, cnpj, commission_rate,
      logo_url, primary_color, background_color, button_color, button_text_color, button_hover,
      user_full_name, user_email, user_username, user_password,
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Nome e slug são obrigatórios' }, { status: 400 });
    }

    if (!user_full_name || !user_email || !user_username || !user_password) {
      return NextResponse.json({ error: 'Dados do primeiro usuário são obrigatórios' }, { status: 400 });
    }

    if (user_password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres' }, { status: 400 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 });
    }

    // Check if username or email already exists
    const { data: existingUser } = await supabase
      .from('affiliate_users')
      .select('username, email')
      .or(`username.eq.${user_username},email.eq.${user_email}`)
      .limit(1)
      .maybeSingle();

    if (existingUser) {
      if (existingUser.username === user_username) {
        return NextResponse.json({ error: 'Nome de usuário já está em uso' }, { status: 400 });
      }
      if (existingUser.email === user_email) {
        return NextResponse.json({ error: 'Email já está cadastrado' }, { status: 400 });
      }
    }

    // 1. Create affiliate with visual identity
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');

    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .insert({
        name,
        slug: cleanSlug,
        domain: domain || null,
        subdomain: cleanSlug,
        cnpj: cnpj || null,
        commission_rate: commission_rate ? parseFloat(commission_rate) : 0.10,
        is_active: true,
        logo_url: logo_url || null,
        primary_color: primary_color || '#f60c49',
        background_color: background_color || '#ffffff',
        button_color: button_color || '#f60c49',
        button_text_color: button_text_color || '#ffffff',
        button_hover: button_hover || '#d40a3f',
      })
      .select()
      .single();

    if (affiliateError) {
      console.error('Error creating affiliate:', affiliateError);
      if (affiliateError.code === '23505') {
        return NextResponse.json({ error: 'Slug já está em uso' }, { status: 400 });
      }
      return NextResponse.json({ error: affiliateError.message }, { status: 500 });
    }

    // 2. Hash password and create first user (owner)
    const passwordHash = await bcrypt.hash(user_password, 10);

    const { error: userError } = await supabase
      .from('affiliate_users')
      .insert({
        affiliate_id: affiliate.id,
        username: user_username.toLowerCase(),
        email: user_email.toLowerCase(),
        password_hash: passwordHash,
        full_name: user_full_name,
        role: 'owner',
        is_active: true,
        email_verified: false,
      });

    if (userError) {
      console.error('Error creating affiliate user:', userError);
      // Rollback: delete the affiliate
      await supabase.from('affiliates').delete().eq('id', affiliate.id);
      return NextResponse.json({ error: 'Erro ao criar usuário: ' + userError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, affiliate });
  } catch (error) {
    console.error('Affiliates POST error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PATCH - Update affiliate
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

    const allowedFields = [
      'name', 'slug', 'domain', 'subdomain', 'custom_domain', 'cnpj',
      'commission_rate', 'is_active', 'logo_url',
      'primary_color', 'background_color', 'button_color', 'button_text_color', 'button_hover',
    ];
    const sanitized = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitized[key] = updates[key];
      }
    }
    sanitized.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('affiliates')
      .update(sanitized)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating affiliate:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, affiliate: data });
  } catch (error) {
    console.error('Affiliates PATCH error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
