import { NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase/server';
import { getSession } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

// GET - lista todas as solicitações de saque de Heads (visão da gestão)
export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 });
  }

  const { data: withdrawals, error } = await supabase
    .from('head_withdrawals')
    .select('*, head:heads(id, name)')
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('Error fetching head withdrawals:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, withdrawals: withdrawals || [] });
}

// PATCH - atualiza status de uma solicitação
export async function PATCH(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 });
  }

  const body = await request.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ error: 'id e status são obrigatórios' }, { status: 400 });
  }
  if (!['pending', 'processing', 'paid', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
  }

  const updates = { status };
  if (status === 'processing') updates.processed_at = new Date().toISOString();
  if (status === 'paid') updates.paid_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('head_withdrawals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating head withdrawal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, withdrawal: data });
}
