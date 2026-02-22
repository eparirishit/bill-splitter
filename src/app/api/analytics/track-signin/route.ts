import { AnalyticsService } from '@/lib/analytics';
import { getAuthenticatedUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await AnalyticsService.trackUserSignin(user.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking user signin:', error);
    return NextResponse.json(
      { error: 'Failed to track user signin' },
      { status: 500 }
    );
  }
}
