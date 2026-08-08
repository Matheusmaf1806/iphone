import { NextResponse } from 'next/server';
import { authenticateAdmin, createSession } from '../../../../lib/auth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Usuário e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await authenticateAdmin(username, password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    // Criar sessão
    createSession(result.session);

    return NextResponse.json({
      success: true,
      session: {
        username: result.session.username,
        fullName: result.session.fullName,
        role: result.session.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
