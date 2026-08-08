import { NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    envVars: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET (' + process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...)' : 'NOT SET',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (length: ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : 'NOT SET',
    },
    isSupabaseConfigured,
    supabaseClient: null,
    queries: {},
  };

  const supabase = createServerClient();
  diagnostics.supabaseClient = supabase ? 'CREATED' : 'NULL';

  if (!supabase) {
    return NextResponse.json(diagnostics);
  }

  // Test: fetch affiliates
  try {
    const { data, error, count } = await supabase
      .from('affiliates')
      .select('id, slug, name, domain, is_active', { count: 'exact' })
      .limit(5);

    diagnostics.queries.affiliates = {
      success: !error,
      error: error?.message || null,
      count: data?.length || 0,
      data: data?.map(a => ({ id: a.id, slug: a.slug, name: a.name, domain: a.domain })) || [],
    };
  } catch (e) {
    diagnostics.queries.affiliates = { success: false, error: e.message };
  }

  // Test: fetch products
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, slug, name, is_active, is_featured, cost_price, price')
      .eq('is_active', true)
      .limit(5);

    diagnostics.queries.products = {
      success: !error,
      error: error?.message || null,
      count: data?.length || 0,
      data: data?.map(p => ({ id: p.id, slug: p.slug, name: p.name, is_featured: p.is_featured, price: p.price })) || [],
    };
  } catch (e) {
    diagnostics.queries.products = { success: false, error: e.message };
  }

  return NextResponse.json(diagnostics);
}
