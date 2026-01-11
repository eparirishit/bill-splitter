import { getSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { AdminAuth } from '@/lib/admin-auth';

export async function GET() {
  try {
    // Require admin access
    await AdminAuth.requireAdmin();

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_analytics')
      .select('*')
      .order('last_signin', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in get-all-users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

