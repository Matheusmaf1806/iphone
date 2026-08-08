import { NextResponse } from 'next/server';
import { registerCustomer, createCustomerSession } from '../../../../lib/customerAuth';
import { getAffiliateConfig } from '../../../../lib/affiliate';

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Nome, e-mail e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Captura o afiliado da loja onde o usuário está se cadastrando
    const affiliateConfig = await getAffiliateConfig();
    const affiliateId = affiliateConfig?.affiliateId !== 'default' ? affiliateConfig.affiliateId : null;

    const result = await registerCustomer({ name, email, password, affiliateId });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Criar sessão automaticamente após cadastro
    createCustomerSession(result.session);

    return NextResponse.json({
      success: true,
      user: {
        name: result.session.name,
        email: result.session.email,
      },
    });
  } catch (error) {
    console.error('Customer register error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
