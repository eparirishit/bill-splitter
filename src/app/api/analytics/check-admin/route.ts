import { NextRequest, NextResponse } from 'next/server';
import { AdminAuth } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin status via session cookie - do NOT trust query params
    const admin = await AdminAuth.getAuthenticatedAdmin();

    return NextResponse.json({
      isAdmin: !!admin
    });
  } catch (error) {
    console.error('Error in check-admin:', error);
    return NextResponse.json(
      { error: 'Failed to check admin status' },
      { status: 500 }
    );
  }
}

