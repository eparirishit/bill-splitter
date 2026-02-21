import { getSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface FlowStatePayload {
  flow: string;
  currentStep: number;
  billData: Record<string, unknown> | null;
  previewImageUrl?: string | null;
}

/** GET: Fetch the user's saved flow state for cross-device resume */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_flow_state')
      .select('flow, current_step, bill_data, preview_image_url, updated_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ data: null });
      }
      console.error('Flow state GET error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch flow state', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data
        ? {
            flow: data.flow,
            currentStep: data.current_step,
            billData: data.bill_data,
            previewImageUrl: data.preview_image_url ?? null,
            updatedAt: data.updated_at,
          }
        : null,
    });
  } catch (err) {
    console.error('Flow state GET:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/** PUT: Save the user's current flow state (upsert by user_id) */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, flow, currentStep, billData, previewImageUrl } = body as {
      userId: string;
      flow: string;
      currentStep: number;
      billData: Record<string, unknown> | null;
      previewImageUrl?: string | null;
    };

    if (!userId || flow == null || currentStep == null) {
      return NextResponse.json(
        { error: 'userId, flow, and currentStep are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('user_flow_state')
      .upsert(
        {
          user_id: userId,
          flow: String(flow),
          current_step: Number(currentStep),
          bill_data: billData ?? null,
          preview_image_url: previewImageUrl ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Flow state PUT error:', error);
      return NextResponse.json(
        { error: 'Failed to save flow state', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Flow state PUT:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
