import { NextResponse } from 'next/server';
import { destroyCustomerSession } from '../../../../lib/customerAuth';

export async function POST() {
  try {
    destroyCustomerSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Customer logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao fazer logout' },
      { status: 500 }
    );
  }
}
