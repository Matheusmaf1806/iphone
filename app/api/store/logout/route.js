import { NextResponse } from 'next/server';
import { destroyStoreSession } from '../../../../lib/storeAuth';

export async function POST() {
  try {
    destroyStoreSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Store logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao fazer logout' },
      { status: 500 }
    );
  }
}
