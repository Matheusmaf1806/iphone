import { NextResponse } from 'next/server';
import { destroySession } from '../../../../lib/auth';

export async function POST() {
  try {
    destroySession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao fazer logout' },
      { status: 500 }
    );
  }
}
