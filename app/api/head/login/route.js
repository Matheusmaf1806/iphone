import { NextResponse } from 'next/server';
import { authenticateHead, createHeadSession } from '../../../../lib/headAuth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Usuário e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await authenticateHead(username, password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    createHeadSession(result.session);

    return NextResponse.json({
      success: true,
      session: {
        username: result.session.username,
        fullName: result.session.fullName,
        headName: result.session.headName,
      },
    });
  } catch (error) {
    console.error('Head login error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
