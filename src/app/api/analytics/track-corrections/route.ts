import { AnalyticsService } from '@/lib/analytics';
import { NextRequest, NextResponse } from 'next/server';
import type { ExtractReceiptDataOutput } from '@/types';

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

    const { receiptId, userId, originalExtraction, userModifications } = body;

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

    if (!originalExtraction) {
      console.error('Missing originalExtraction in request body:', { body, originalExtraction });
      return NextResponse.json(
        { error: 'originalExtraction is required', received: body },
        { status: 400 }
      );
    }

    if (!userModifications) {
      console.error('Missing userModifications in request body:', { body, userModifications });
      return NextResponse.json(
        { error: 'userModifications is required', received: body },
        { status: 400 }
      );
    }

    // Convert userId to string (Splitwise IDs can be numbers)
    const userIdString = String(userId);

    await AnalyticsService.trackCorrections(
      String(receiptId),
      userIdString,
      originalExtraction as ExtractReceiptDataOutput,
      userModifications
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking corrections:', error);
    return NextResponse.json(
      { error: 'Failed to track corrections', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

