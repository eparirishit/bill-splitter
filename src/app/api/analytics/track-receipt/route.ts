import { AnalyticsService } from '@/lib/analytics';
import { NextRequest, NextResponse } from 'next/server';
import type { ExtractReceiptDataOutput } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      aiExtraction,
      processingTimeMs,
      aiModelVersion,
      aiProvider,
      aiModelName,
      aiTokensUsed,
      aiProcessingTimeMs,
      existingImageUrl,
      originalFilename,
      fileSize,
      existingImageHash
    } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!aiExtraction) {
      return NextResponse.json(
        { error: 'aiExtraction is required' },
        { status: 400 }
      );
    }

    if (!existingImageUrl) {
      return NextResponse.json(
        { error: 'existingImageUrl is required' },
        { status: 400 }
      );
    }

    // Note: File upload is handled separately via uploadImageToStorage
    // We only track the receipt processing here with the already-uploaded image URL
    const receiptId = await AnalyticsService.trackReceiptProcessing(
      userId,
      null, // File is not needed since imageUrl is provided
      aiExtraction as ExtractReceiptDataOutput,
      processingTimeMs || 0,
      aiModelVersion,
      aiProvider,
      aiModelName,
      aiTokensUsed,
      aiProcessingTimeMs,
      existingImageUrl,
      existingImageHash,
      originalFilename,
      fileSize
    );

    return NextResponse.json({ success: true, receiptId });
  } catch (error) {
    console.error('Error tracking receipt processing:', error);
    return NextResponse.json(
      { error: 'Failed to track receipt processing' },
      { status: 500 }
    );
  }
}

