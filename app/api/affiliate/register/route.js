import { NextResponse } from 'next/server';
import { createAffiliate } from '../../../../lib/affiliateAuth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { fullName, email, username, password, phone, cpf } = body;

    if (!fullName || !email || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'Nome, email, usuário e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'A senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      );
    }

    const result = await createAffiliate({
      fullName,
      email,
      username,
      password,
      phone: phone || null,
      cpf: cpf || null,
      slug: username,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso! Faça login para continuar.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
