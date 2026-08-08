import { NextResponse } from 'next/server';
import { getAffiliateSession } from '../../../../../lib/affiliateAuth';
import { createServerClient } from '../../../../../lib/supabase/server';

// Forçar rota dinâmica (usa cookies)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = getAffiliateSession();
    console.log('[Visual API GET] Session:', session ? `User ID: ${session.userId}, Affiliate ID: ${session.affiliateId}` : 'null');

    if (!session) {
      console.log('[Visual API GET] No session found');
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    if (!supabase) {
      console.log('[Visual API GET] Supabase client not configured');
      return NextResponse.json(
        { success: false, error: 'Serviço não configurado' },
        { status: 500 }
      );
    }

    console.log('[Visual API GET] Fetching affiliate data for ID:', session.affiliateId);

    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('logo_url, favicon_url, primary_color, background_color, button_color, button_text_color, button_hover, instagram_handle, whatsapp_number')
      .eq('id', session.affiliateId)
      .single();

    if (error) {
      console.error('[Visual API GET] Error fetching visual settings:', error);
      return NextResponse.json(
        { success: false, error: `Erro ao buscar configurações: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('[Visual API GET] Affiliate data fetched successfully:', affiliate);

    return NextResponse.json({
      success: true,
      data: {
        logoUrl: affiliate.logo_url || '',
        faviconUrl: affiliate.favicon_url || '',
        primaryColor: affiliate.primary_color || '#0043f7',
        backgroundColor: affiliate.background_color || '#ebf0f6',
        buttonColor: affiliate.button_color || '#0043f7',
        buttonTextColor: affiliate.button_text_color || '#0c0e0b',
        buttonHover: affiliate.button_hover || '#0036c6',
        instagramHandle: affiliate.instagram_handle || '',
        whatsappNumber: affiliate.whatsapp_number || '',
      },
    });
  } catch (error) {
    console.error('Visual settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = getAffiliateSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Serviço não configurado' },
        { status: 500 }
      );
    }

    // Validar formato de cores (hex)
    const colorRegex = /^#[0-9A-F]{6}$/i;
    const colors = {
      primary_color: body.primaryColor,
      background_color: body.backgroundColor,
      button_color: body.buttonColor,
      button_text_color: body.buttonTextColor,
      button_hover: body.buttonHover,
    };

    for (const [key, value] of Object.entries(colors)) {
      if (value && !colorRegex.test(value)) {
        return NextResponse.json(
          { success: false, error: `Cor inválida para ${key}. Use formato hexadecimal (#RRGGBB)` },
          { status: 400 }
        );
      }
    }

    const updates = {
      logo_url: body.logoUrl || null,
      favicon_url: body.faviconUrl || null,
      primary_color: body.primaryColor || null,
      background_color: body.backgroundColor || null,
      button_color: body.buttonColor || null,
      button_text_color: body.buttonTextColor || null,
      button_hover: body.buttonHover || null,
      instagram_handle: body.instagramHandle ? body.instagramHandle.trim().replace(/^@/, '') : null,
      whatsapp_number: body.whatsappNumber ? body.whatsappNumber.replace(/\D/g, '') : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('affiliates')
      .update(updates)
      .eq('id', session.affiliateId);

    if (error) {
      console.error('Error updating visual settings:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao salvar configurações' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações visuais salvas com sucesso',
    });
  } catch (error) {
    console.error('Visual settings update error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
