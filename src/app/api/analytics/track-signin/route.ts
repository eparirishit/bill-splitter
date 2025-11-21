import { AnalyticsService } from '@/lib/analytics';
import { NextRequest, NextResponse } from 'next/server';

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

    const { userId } = body;

    if (userId === undefined || userId === null || userId === '') {
      console.error('Missing userId in request body:', { body, userId });
      return NextResponse.json(
        { error: 'userId is required', received: body },
        { status: 400 }
      );
    }

    const userIdString = String(userId);
    await AnalyticsService.trackUserSignin(userIdString);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking user signin:', error);
    return NextResponse.json(
      { error: 'Failed to track user signin', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

