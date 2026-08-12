import { NextResponse } from 'next/server';
import { createServerClient } from '../../../../lib/supabase/server';
import { getHeadSession } from '../../../../lib/headAuth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// Cria um afiliado direto pelo painel do Head — já nasce vinculado à carteira dele
// (head_id/head_joined_at), sem precisar de ninguém da gestão atribuir manualmente.
// A iShop continua no controle total: pode reatribuir, remover ou editar esse
// afiliado normalmente pela tela /gestao/erp/afiliados depois.
export async function POST(request) {
  try {
    const session = getHeadSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name, slug, commission_rate,
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

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');

    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .insert({
        name,
        slug: cleanSlug,
        subdomain: cleanSlug,
        commission_rate: commission_rate ? parseFloat(commission_rate) : 10,
        is_active: true,
        head_id: session.headId,
        head_joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (affiliateError) {
      console.error('Error creating affiliate from head:', affiliateError);
      if (affiliateError.code === '23505') {
        return NextResponse.json({ error: 'Slug já está em uso' }, { status: 400 });
      }
      return NextResponse.json({ error: affiliateError.message }, { status: 500 });
    }

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
      console.error('Error creating affiliate user from head:', userError);
      const { error: rollbackError } = await supabase.from('affiliates').delete().eq('id', affiliate.id);
      if (rollbackError) {
        console.error('Error rolling back affiliate after user creation failure:', rollbackError);
        return NextResponse.json({
          error: `Erro ao criar usuário (${userError.message}) e também falhou ao desfazer o afiliado criado — avise a iShop pra apagar manualmente "${affiliate.name}" (id ${affiliate.id}).`,
        }, { status: 500 });
      }
      return NextResponse.json({ error: 'Erro ao criar usuário: ' + userError.message }, { status: 500 });
    }

    await supabase.from('head_wallet_events').insert({
      head_id: session.headId,
      affiliate_id: affiliate.id,
      event: 'assigned',
    });

    return NextResponse.json({ success: true, affiliate });
  } catch (error) {
    console.error('Head create affiliate error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
