import { SupportService } from '@/services/support-service';
import { NextRequest, NextResponse } from 'next/server';
import { AdminAuth } from '@/lib/admin-auth';

export async function PUT(request: NextRequest) {
  try {
    await AdminAuth.requireAdmin(); // Ensure admin access

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id, status' },
        { status: 400 }
      );
    }

    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: open, in_progress, resolved, closed' },
        { status: 400 }
      );
    }

    await SupportService.updateSupportRequestStatus(id, status);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating support request status:', error);
    return NextResponse.json(
      {
        error: 'Failed to update support request status',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

