import { SupportService } from '@/services/support-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'bug' | 'feature' | 'general' | 'support' | null;
    const status = searchParams.get('status') as 'open' | 'in_progress' | 'resolved' | 'closed' | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const requests = await SupportService.getAllSupportRequests({
      type: type || undefined,
      status: status || undefined,
      limit
    });

    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    console.error('Error fetching support requests:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch support requests', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

