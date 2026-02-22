import { AnalyticsService } from '@/lib/analytics';
import { getAuthenticatedUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import type { ExtractReceiptDataOutput } from '@/types';

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

    const { receiptId, originalExtraction, userModifications } = body;

    if (!receiptId || (typeof receiptId !== 'string' && typeof receiptId !== 'number')) {
      return NextResponse.json(
        { error: 'receiptId is required' },
        { status: 400 }
      );
    }

    if (!originalExtraction) {
      return NextResponse.json(
        { error: 'originalExtraction is required' },
        { status: 400 }
      );
    }

    if (!userModifications) {
      return NextResponse.json(
        { error: 'userModifications is required' },
        { status: 400 }
      );
    }

    await AnalyticsService.trackCorrections(
      String(receiptId),
      user.userId,
      originalExtraction as ExtractReceiptDataOutput,
      userModifications
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking corrections:', error);
    return NextResponse.json(
      { error: 'Failed to track corrections' },
      { status: 500 }
    );
  }
}
