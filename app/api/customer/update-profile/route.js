import { NextResponse } from 'next/server';
import { getCustomerSession, createCustomerSession } from '../../../../lib/customerAuth';
import { createServerClient } from '../../../../lib/supabase/server';

export async function POST(request) {
  try {
    const session = getCustomerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { phone, cpf, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zipcode } = body;

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Serviço indisponível' },
        { status: 500 }
      );
    }

    const updateData = {};
    if (phone) updateData.phone = phone;
    if (cpf) updateData.cpf = cpf;
    if (address_street) updateData.address_street = address_street;
    if (address_number) updateData.address_number = address_number;
    if (address_complement !== undefined) updateData.address_complement = address_complement;
    if (address_neighborhood) updateData.address_neighborhood = address_neighborhood;
    if (address_city) updateData.address_city = address_city;
    if (address_state) updateData.address_state = address_state;
    if (address_zipcode) updateData.address_zipcode = address_zipcode;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase
      .from('user_ecommerce')
      .update(updateData)
      .eq('id', session.userId);

    if (error) {
      console.error('Error updating customer profile:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao atualizar perfil' },
        { status: 500 }
      );
    }

    // Atualizar sessão com os novos dados
    const updatedSession = {
      ...session,
      ...updateData,
      timestamp: session.timestamp,
    };
    createCustomerSession(updatedSession);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
