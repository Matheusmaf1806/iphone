import { NextResponse } from 'next/server';
import { createServerClient } from '../../../../lib/supabase/server';
import { requireAuth } from '../../../../lib/auth';
import { DEFAULT_INSTALLMENT_FEES } from '../../../../lib/installmentFees';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('installment_fees')
      .select('*')
      .order('installments');

    if (error) throw error;

    // Se a migration ainda não rodou nesse banco, devolve os valores fictícios
    // padrão pra tela não quebrar (nada é salvo até o admin editar e salvar).
    const rows = data && data.length > 0
      ? data
      : Object.entries(DEFAULT_INSTALLMENT_FEES).map(([installments, fee_percentage]) => ({
          installments: parseInt(installments, 10),
          fee_percentage,
        }));

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching installment fees:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { installments, feePercentage } = await request.json();
    const installmentsNum = parseInt(installments, 10);
    const feeNum = parseFloat(feePercentage);

    if (!installmentsNum || installmentsNum < 1 || installmentsNum > 10) {
      return NextResponse.json({ success: false, error: 'Número de parcelas inválido' }, { status: 400 });
    }
    if (isNaN(feeNum) || feeNum < 0) {
      return NextResponse.json({ success: false, error: 'Taxa inválida' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('installment_fees')
      .upsert({ installments: installmentsNum, fee_percentage: feeNum }, { onConflict: 'installments' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating installment fee:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
