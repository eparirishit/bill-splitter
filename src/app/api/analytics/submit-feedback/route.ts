import { AnalyticsService } from '@/lib/analytics';
import { NextRequest, NextResponse } from 'next/server';
import type { UserFeedback } from '@/types/analytics';

export async function POST(request: NextRequest) {
  try {
    const { receiptId, userId, feedback } = await request.json();

    if (!receiptId || typeof receiptId !== 'string') {
      return NextResponse.json(
        { error: 'receiptId is required' },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
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
      receiptId,
      userId,
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

