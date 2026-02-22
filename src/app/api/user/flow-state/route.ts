import { getAuthenticatedUser } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface FlowStatePayload {
  flow: string;
  currentStep: number;
  billData: Record<string, unknown> | null;
  previewImageUrl?: string | null;
}

/** GET: Fetch the user's saved flow state(s) */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const type = request.nextUrl.searchParams.get('type') || 'last'; // 'last' or 'all'

    const supabase = getSupabaseClient();
    let query = supabase
      .from('user_flow_state')
      .select('flow, current_step, bill_data, preview_image_url, updated_at, bill_id, is_last_active, store_name, total_amount')
      .eq('user_id', user.userId);

    if (type === 'last') {
      // Find the most recently updated state that is explicitly marked as last active
      const { data, error } = await query
        .eq('is_last_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return NextResponse.json({
        data: data
          ? {
            flow: data.flow,
            currentStep: data.current_step,
            billData: data.bill_data,
            previewImageUrl: data.preview_image_url ?? null,
            updatedAt: data.updated_at,
            billId: data.bill_id,
          }
          : null,
      });
    } else {
      const { data, error } = await query.order('updated_at', { ascending: false });
      if (error) throw error;

      return NextResponse.json({
        data: data.map(item => ({
          flow: item.flow,
          currentStep: item.current_step,
          billData: item.bill_data,
          previewImageUrl: item.preview_image_url ?? null,
          updatedAt: item.updated_at,
          billId: item.bill_id,
          isLastActive: item.is_last_active,
          storeName: item.store_name,
          totalAmount: item.total_amount
        }))
      });
    }
  } catch (err) {
    console.error('Flow state GET:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/** PUT: Save the user's current flow state */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { flow, currentStep, billData, previewImageUrl } = body as {
      flow: string;
      currentStep: number;
      billData: Record<string, any> | null;
      previewImageUrl?: string | null;
    };

    if (flow == null || currentStep == null) {
      return NextResponse.json(
        { error: 'flow and currentStep are required' },
        { status: 400 }
      );
    }

    const billId = billData?.id as string || 'default';
    const storeName = billData?.storeName as string || 'New Split';
    let totalAmount = (billData?.total as number) ?? 0;
    // Compute from items when total is 0 (e.g. manual flow may not set total explicitly)
    if (totalAmount === 0 && billData?.items && Array.isArray(billData.items)) {
      const subtotal = (billData.items as { price?: number }[]).reduce((s, i) => s + (i.price ?? 0), 0);
      const tax = (billData.tax as number) ?? 0;
      const discount = (billData.discount as number) ?? 0;
      const otherCharges = (billData.otherCharges as number) ?? 0;
      totalAmount = subtotal + tax + otherCharges - discount;
    }

    const supabase = getSupabaseClient();

    // 1. If this is a valid active flow, mark all other flows for this user as NOT last active
    if (flow !== 'NONE' && currentStep > 0) {
      await supabase
        .from('user_flow_state')
        .update({ is_last_active: false })
        .eq('user_id', user.userId)
        .neq('bill_id', billId);
    }

    // 2. Upsert the current flow state
    const { error } = await supabase
      .from('user_flow_state')
      .upsert(
        {
          user_id: user.userId,
          bill_id: billId,
          flow: String(flow),
          current_step: Number(currentStep),
          bill_data: billData ?? null,
          preview_image_url: previewImageUrl ?? null,
          updated_at: new Date().toISOString(),
          is_last_active: flow !== 'NONE', // If flow is NONE, it's not the last active split
          store_name: storeName,
          total_amount: totalAmount
        },
        { onConflict: 'user_id, bill_id' }
      );

    if (error) {
      console.error('Flow state PUT error:', error);
      return NextResponse.json(
        { error: 'Failed to save flow state' },
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

/** DELETE: Delete a specific flow state draft */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const billId = request.nextUrl.searchParams.get('billId');

    if (!billId) {
      return NextResponse.json(
        { error: 'billId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('user_flow_state')
      .delete()
      .eq('user_id', user.userId)
      .eq('bill_id', billId);

    if (error) {
      console.error('Flow state DELETE error:', error);
      return NextResponse.json(
        { error: 'Failed to delete flow state' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Flow state DELETE:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
