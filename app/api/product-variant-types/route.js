import { NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase/server';
import { requireAuth } from '../../../lib/auth';

// GET - Lista tipos de atributo (ex: Cor, Armazenamento) e, opcionalmente, seus valores
export async function GET(request) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeValues = searchParams.get('withValues') === 'true';
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let query = supabase
      .from('product_variant_types')
      .select(includeValues ? '*, values:product_variant_values(*)' : '*')
      .order('display_order', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (includeValues) {
      data.forEach(type => {
        type.values = (type.values || [])
          .filter(v => includeInactive || v.is_active)
          .sort((a, b) => a.display_order - b.display_order);
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching variant types:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Cria um novo tipo de atributo (ex: "Cor") ou um novo valor (?resource=values)
export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');
    const body = await request.json();

    if (resource === 'values') {
      const { variant_type_id, value, swatch_hex, display_order } = body;
      if (!variant_type_id || !value) {
        return NextResponse.json(
          { success: false, error: 'variant_type_id e value são obrigatórios' },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from('product_variant_values')
        .insert([{
          variant_type_id,
          value: value.trim(),
          swatch_hex: swatch_hex || null,
          display_order: display_order || 0,
        }])
        .select()
        .single();

      if (error) {
        // valor duplicado para o mesmo tipo -> devolve o já existente em vez de erro
        if (error.code === '23505') {
          const { data: existing } = await supabase
            .from('product_variant_values')
            .select('*')
            .eq('variant_type_id', variant_type_id)
            .eq('value', value.trim())
            .single();
          if (existing) {
            return NextResponse.json({ success: true, data: existing });
          }
        }
        throw error;
      }

      return NextResponse.json({ success: true, data });
    }

    // Criar tipo de atributo
    const { name, display_order } = body;
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nome do atributo é obrigatório' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('product_variant_types')
      .insert([{ name: name.trim(), display_order: display_order || 0 }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating variant type/value:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Atualiza um tipo de atributo ou um valor (?resource=values)
export async function PUT(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
    }

    const table = resource === 'values' ? 'product_variant_values' : 'product_variant_types';

    const { data, error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating variant type/value:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Desativa um tipo de atributo ou um valor (?resource=values) — soft delete
// (não apaga de verdade para não quebrar variantes/pedidos antigos que já usam o valor)
export async function DELETE(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const resource = searchParams.get('resource');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
    }

    const table = resource === 'values' ? 'product_variant_values' : 'product_variant_types';

    const { error } = await supabase
      .from(table)
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating variant type/value:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
