import { AnalyticsService } from '@/lib/analytics';
import { NextRequest, NextResponse } from 'next/server';
import type { UserFeedback } from '@/types/analytics';

export async function POST(request: NextRequest) {
  try {
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

    const { receiptId, userId, feedback } = body;

    if (!receiptId || (typeof receiptId !== 'string' && typeof receiptId !== 'number')) {
      console.error('Missing or invalid receiptId in request body:', { body, receiptId });
      return NextResponse.json(
        { error: 'receiptId is required', received: body },
        { status: 400 }
      );
    }

    if (userId === undefined || userId === null || userId === '') {
      console.error('Missing userId in request body:', { body, userId });
      return NextResponse.json(
        { error: 'userId is required', received: body },
        { status: 400 }
      );
    }

    // Convert userId to string (Splitwise IDs can be numbers)
    const userIdString = String(userId);

    if (!feedback) {
      console.error('Missing feedback in request body:', { body, feedback });
      return NextResponse.json(
        { error: 'feedback is required', received: body },
        { status: 400 }
      );
    }

    await AnalyticsService.submitFeedback(
      String(receiptId),
      userIdString,
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

