import { NextResponse } from 'next/server';
import { destroyHeadSession } from '../../../../lib/headAuth';

export async function POST() {
  try {
    destroyHeadSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Head logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao fazer logout' },
      { status: 500 }
    );
  }
}
