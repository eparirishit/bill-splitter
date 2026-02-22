import { AnalyticsService } from '@/lib/analytics';
import { getAuthenticatedUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import type { UserFeedback } from '@/types/analytics';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { receiptId, feedback } = body;

    if (!receiptId || (typeof receiptId !== 'string' && typeof receiptId !== 'number')) {
      return NextResponse.json(
        { error: 'receiptId is required' },
        { status: 400 }
      );
    }

    if (!feedback) {
      return NextResponse.json(
        { error: 'feedback is required' },
        { status: 400 }
      );
    }

    await AnalyticsService.submitFeedback(
      String(receiptId),
      user.userId,
      feedback as Omit<UserFeedback, 'submitted_at'>
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
