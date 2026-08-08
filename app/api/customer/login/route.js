import { NextResponse } from 'next/server';
import { authenticateCustomer, createCustomerSession } from '../../../../lib/customerAuth';
import { getAffiliateConfig } from '../../../../lib/affiliate';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'E-mail e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const affiliateConfig = await getAffiliateConfig();
    const storeAffiliateId = affiliateConfig?.affiliateId && affiliateConfig.affiliateId !== 'default'
      ? affiliateConfig.affiliateId
      : null;

    const result = await authenticateCustomer(email, password, storeAffiliateId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    createCustomerSession(result.session);

    return NextResponse.json({
      success: true,
      user: {
        name: result.session.name,
        email: result.session.email,
        affiliateId: result.session.affiliateId || null,
      },
    });
  } catch (error) {
    console.error('Customer login error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
