import { NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase/server';
import { requireAuth } from '../../../lib/auth';

// GET — lista de locais. Sem auth quando só pede os ativos (usado no checkout,
// tela pública); com auth exige token de admin quando pede todos (inclusive
// inativos, usado na tela de gestão).
export async function GET(request) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Serviço não configurado' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get('all') === 'true';

  if (includeInactive) {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
  }

  let query = supabase.from('pickup_locations').select('*').order('display_order').order('name');
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching pickup locations:', error);
    return NextResponse.json({ success: false, error: 'Erro ao buscar locais de retirada' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data || [] });
}

export async function POST(request) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Serviço não configurado' }, { status: 500 });
  }

  const body = await request.json();
  const { name, address, city, state, zip_code, notes, is_active, display_order } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ success: false, error: 'Nome do local é obrigatório' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('pickup_locations')
    .insert({
      name: name.trim(),
      address: address || null,
      city: city || 'Orlando',
      state: state || 'FL',
      zip_code: zip_code || null,
      notes: notes || null,
      is_active: is_active !== false,
      display_order: display_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating pickup location:', error);
    const message = error.code === '23505' ? 'Já existe um local com esse nome' : 'Erro ao criar local de retirada';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}

export async function PUT(request) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Serviço não configurado' }, { status: 500 });
  }

  const body = await request.json();
  const { id, name, address, city, state, zip_code, notes, is_active, display_order } = body;

  if (!id) {
    return NextResponse.json({ success: false, error: 'ID é obrigatório' }, { status: 400 });
  }

  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (address !== undefined) updates.address = address;
  if (city !== undefined) updates.city = city;
  if (state !== undefined) updates.state = state;
  if (zip_code !== undefined) updates.zip_code = zip_code;
  if (notes !== undefined) updates.notes = notes;
  if (is_active !== undefined) updates.is_active = is_active;
  if (display_order !== undefined) updates.display_order = display_order;

  const { data, error } = await supabase
    .from('pickup_locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating pickup location:', error);
    const message = error.code === '23505' ? 'Já existe um local com esse nome' : 'Erro ao atualizar local de retirada';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ success: false, error: 'Local não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(request) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Serviço não configurado' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'ID é obrigatório' }, { status: 400 });
  }

  // Nunca apaga um local com pedidos vinculados — desativa em vez disso, pra
  // não perder o histórico de qual local cada pedido antigo usou.
  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('pickup_location_id', id);

  if (count && count > 0) {
    const { data, error } = await supabase
      .from('pickup_locations')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ success: false, error: 'Erro ao desativar local' }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      data,
      message: `Esse local tem ${count} pedido(s) vinculado(s) — foi desativado em vez de excluído, pra manter o histórico.`,
    });
  }

  const { error } = await supabase.from('pickup_locations').delete().eq('id', id);
  if (error) {
    console.error('Error deleting pickup location:', error);
    return NextResponse.json({ success: false, error: 'Erro ao excluir local' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
