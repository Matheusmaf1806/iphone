import { NextResponse } from 'next/server';
import { destroyAffiliateSession } from '../../../../lib/affiliateAuth';

export async function POST() {
  try {
    destroyAffiliateSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Affiliate logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao fazer logout' },
      { status: 500 }
    );
  }
}
