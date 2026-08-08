import { NextResponse } from 'next/server';
import { authenticateAffiliate, createAffiliateSession } from '../../../../lib/affiliateAuth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Usuário e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await authenticateAffiliate(username, password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    // Criar sessão
    createAffiliateSession(result.session);

    return NextResponse.json({
      success: true,
      session: {
        username: result.session.username,
        fullName: result.session.fullName,
        commissionPercentage: result.session.commissionPercentage,
      },
    });
  } catch (error) {
    console.error('Affiliate login error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
