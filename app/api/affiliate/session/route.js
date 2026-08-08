import { NextResponse } from 'next/server';
import { getAffiliateSession } from '../../../../lib/affiliateAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = getAffiliateSession();

    if (!session) {
      return NextResponse.json({ session: null }, { status: 200 });
    }

    return NextResponse.json({
      session: {
        userId: session.userId,
        username: session.username,
        fullName: session.fullName,
        role: session.role,
        affiliateId: session.affiliateId,
        affiliateName: session.affiliateName,
        commissionPercentage: session.commissionPercentage,
      },
    });
  } catch (error) {
    console.error('[AffiliateSession] Error:', error);
    return NextResponse.json({ session: null }, { status: 200 });
  }
}
