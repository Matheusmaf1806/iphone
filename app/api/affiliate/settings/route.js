import { NextResponse } from 'next/server';
import { getAffiliateSession } from '../../../../lib/affiliateAuth';
import { createServerClient } from '../../../../lib/supabase/server';
import bcrypt from 'bcryptjs';

// Forçar rota dinâmica (usa cookies)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = getAffiliateSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Serviço não configurado' },
        { status: 500 }
      );
    }

    // All personal + address data lives on affiliate_users
    const { data: user, error: userError } = await supabase
      .from('affiliate_users')
      .select('full_name, email, phone, cpf, pix_key, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip')
      .eq('id', session.userId)
      .single();

    if (userError) {
      console.error('[Settings GET] Error fetching affiliate user:', userError);
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar dados do usuário' },
        { status: 500 }
      );
    }

    // Only commission_rate from affiliates table
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('commission_rate')
      .eq('id', session.affiliateId)
      .single();

    if (affiliateError) {
      console.error('[Settings GET] Error fetching affiliate:', affiliateError);
    }

    // profile_photo_url may not exist as a column yet - query separately
    let profilePhotoUrl = '';
    try {
      const { data: photoData, error: photoError } = await supabase
        .from('affiliate_users')
        .select('profile_photo_url')
        .eq('id', session.userId)
        .single();
      if (!photoError && photoData) {
        profilePhotoUrl = photoData.profile_photo_url || '';
      }
    } catch (e) {
      // Column doesn't exist yet - that's ok
    }

    return NextResponse.json({
      success: true,
      data: {
        full_name: user?.full_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        cpf: user?.cpf || '',
        pix_key: user?.pix_key || '',
        profile_photo_url: profilePhotoUrl,
        commission_percentage: affiliate?.commission_rate || 10,
        address_street: user?.address_street || '',
        address_number: user?.address_number || '',
        address_complement: user?.address_complement || '',
        address_neighborhood: user?.address_neighborhood || '',
        address_city: user?.address_city || '',
        address_state: user?.address_state || '',
        address_zip: user?.address_zip || '',
      },
    });
  } catch (error) {
    console.error('[Settings GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const session = getAffiliateSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const updates = await request.json();
    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Serviço não configurado' },
        { status: 500 }
      );
    }

    // Validar margem se estiver sendo atualizada
    if (updates.commission_percentage !== undefined) {
      const margin = parseFloat(updates.commission_percentage);
      if (margin < 5 || margin > 20) {
        return NextResponse.json(
          { success: false, error: 'Margem deve estar entre 5% e 20%' },
          { status: 400 }
        );
      }
    }

    // Se estiver atualizando senha
    if (updates.password) {
      const { currentPassword, newPassword } = updates;

      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { success: false, error: 'Senha atual e nova senha são obrigatórias' },
          { status: 400 }
        );
      }

      const { data: user, error: fetchError } = await supabase
        .from('affiliate_users')
        .select('password_hash')
        .eq('id', session.userId)
        .single();

      if (fetchError || !user) {
        return NextResponse.json(
          { success: false, error: 'Erro ao verificar senha' },
          { status: 500 }
        );
      }

      const isValid = await bcrypt.compare(currentPassword, user.password_hash);

      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Senha atual incorreta' },
          { status: 400 }
        );
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      const { error: pwError } = await supabase
        .from('affiliate_users')
        .update({ password_hash: passwordHash })
        .eq('id', session.userId);

      if (pwError) {
        console.error('[Settings PATCH] Error updating password:', pwError);
        return NextResponse.json(
          { success: false, error: 'Erro ao atualizar senha' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Senha atualizada com sucesso',
      });
    }

    // ALL personal + address fields go to affiliate_users table
    const userFields = [
      'full_name', 'email', 'phone', 'cpf', 'pix_key', 'profile_photo_url',
      'address_street', 'address_number', 'address_complement',
      'address_neighborhood', 'address_city', 'address_state', 'address_zip',
    ];

    const userUpdates = {};
    const affiliateUpdates = {};

    for (const [key, value] of Object.entries(updates)) {
      if (userFields.includes(key)) {
        userUpdates[key] = value;
      } else if (key === 'commission_percentage') {
        affiliateUpdates.commission_rate = parseFloat(value);
      }
    }

    // Update affiliate_users
    if (Object.keys(userUpdates).length > 0) {
      const { error: userError } = await supabase
        .from('affiliate_users')
        .update(userUpdates)
        .eq('id', session.userId);

      if (userError) {
        console.error('[Settings PATCH] Error updating affiliate user:', userError);

        // If error mentions a column (e.g. profile_photo_url doesn't exist), retry without it
        if (userError.message && userError.message.includes('profile_photo_url')) {
          console.log('[Settings PATCH] Retrying without profile_photo_url');
          delete userUpdates.profile_photo_url;
          if (Object.keys(userUpdates).length > 0) {
            const { error: retryError } = await supabase
              .from('affiliate_users')
              .update(userUpdates)
              .eq('id', session.userId);

            if (retryError) {
              console.error('[Settings PATCH] Retry error:', retryError);
              return NextResponse.json(
                { success: false, error: `Erro ao atualizar dados: ${retryError.message}` },
                { status: 500 }
              );
            }
            // Partial success - saved everything except photo
            return NextResponse.json({
              success: true,
              message: 'Dados atualizados (foto de perfil requer adicionar coluna profile_photo_url na tabela affiliate_users)',
            });
          }
        }

        return NextResponse.json(
          { success: false, error: `Erro ao atualizar dados: ${userError.message}` },
          { status: 500 }
        );
      }
    }

    // Update affiliates (only commission_rate goes here)
    if (Object.keys(affiliateUpdates).length > 0) {
      const { error: affiliateError } = await supabase
        .from('affiliates')
        .update(affiliateUpdates)
        .eq('id', session.affiliateId);

      if (affiliateError) {
        console.error('[Settings PATCH] Error updating affiliate:', affiliateError);
        return NextResponse.json(
          { success: false, error: `Erro ao atualizar margem: ${affiliateError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Dados atualizados com sucesso',
    });
  } catch (error) {
    console.error('[Settings PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
