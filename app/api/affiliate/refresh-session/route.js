import { NextResponse } from 'next/server';
import { getAffiliateSession, createAffiliateSession } from '../../../../lib/affiliateAuth';
import { createServerClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Refreshes the affiliate session cookie with latest data from DB.
 * Call this after updating user profile (photo, name, etc.) so the
 * sidebar reflects the changes without requiring re-login.
 */
export async function POST() {
  try {
    const session = getAffiliateSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 });
    }

    // Fetch latest user data
    const { data: user, error: userError } = await supabase
      .from('affiliate_users')
      .select('full_name, email, role')
      .eq('id', session.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Try to get profile_photo_url (column may not exist)
    let profilePhotoUrl = session.profilePhotoUrl || null;
    try {
      const { data: photoData, error: photoError } = await supabase
        .from('affiliate_users')
        .select('profile_photo_url')
        .eq('id', session.userId)
        .single();
      if (!photoError && photoData) {
        profilePhotoUrl = photoData.profile_photo_url || null;
      }
    } catch (e) {}

    // Fetch latest affiliate data
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('id, slug, name, logo_url, commission_rate')
      .eq('id', session.affiliateId)
      .single();

    // Build updated session
    const updatedSession = {
      ...session,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      profilePhotoUrl,
      affiliateName: affiliate?.name || session.affiliateName,
      affiliateLogoUrl: affiliate?.logo_url || session.affiliateLogoUrl,
      commissionPercentage: affiliate?.commission_rate || session.commissionPercentage,
      timestamp: Date.now(),
    };

    // Write updated session to cookie
    createAffiliateSession(updatedSession);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[RefreshSession] Error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar sessão' }, { status: 500 });
  }
}
