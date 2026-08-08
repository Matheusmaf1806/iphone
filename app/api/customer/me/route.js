import { NextResponse } from 'next/server';
import { getCustomerSession } from '../../../../lib/customerAuth';

export async function GET() {
  try {
    const session = getCustomerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        name: session.name,
        email: session.email,
        phone: session.phone,
        cpf: session.cpf,
        address_street: session.address_street,
        address_number: session.address_number,
        address_complement: session.address_complement,
        address_neighborhood: session.address_neighborhood,
        address_city: session.address_city,
        address_state: session.address_state,
        address_zipcode: session.address_zipcode,
        affiliateId: session.affiliateId || null,
      },
    });
  } catch (error) {
    console.error('Customer me error:', error);
    return NextResponse.json(
      { success: false, user: null },
      { status: 200 }
    );
  }
}
