import { NextResponse } from 'next/server';
import { createServerClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Serviço não configurado' },
        { status: 500 }
      );
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, slug, image_url, price, category')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
      .order('name')
      .limit(10);

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar produtos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: products || [],
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
