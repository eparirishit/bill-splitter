import { getSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { AdminAuth } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    // Require admin access
    await AdminAuth.requireAdmin();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('receipt_processing_history')
      .select('id, user_id, feedback, ai_extraction, created_at')
      .not('feedback', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching feedback logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback logs', details: error.message },
        { status: 500 }
      );
    }

    // Get user profiles for feedback logs
    const userIds = [...new Set(data?.map(item => item.user_id) || [])];
    const { data: userData } = await supabase
      .from('user_analytics')
      .select('user_id, user_profile')
      .in('user_id', userIds);

    const userMap = new Map(
      userData?.map(u => [u.user_id, u.user_profile]) || []
    );

    // Format feedback logs with user info
    const feedbackLogs = data?.map(item => ({
      id: item.id,
      receiptId: item.id,
      userId: item.user_id,
      userName: userMap.get(item.user_id)?.first_name
        ? `${userMap.get(item.user_id)?.first_name} ${userMap.get(item.user_id)?.last_name || ''}`.trim()
        : `User ${item.user_id}`,
      storeName: item.ai_extraction?.storeName || 'Unknown Store',
      type: item.feedback?.overall_accuracy === 'thumbs_up' ? 'accurate' : 'needs_fix',
      timestamp: item.created_at,
      feedback: item.feedback
    })) || [];

    return NextResponse.json({ success: true, data: feedbackLogs });
  } catch (error) {
    console.error('Error in get-feedback-logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback logs', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

