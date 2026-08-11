import { NextResponse } from 'next/server';
import { authenticateStore, createStoreSession } from '../../../../lib/storeAuth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Usuário e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await authenticateStore(username, password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    createStoreSession(result.session);

    return NextResponse.json({
      success: true,
      session: {
        username: result.session.username,
        fullName: result.session.fullName,
      },
    });
  } catch (error) {
    console.error('Store login error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
