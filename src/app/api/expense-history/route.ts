import { getSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// Type for expense history record
interface ExpenseHistoryRecord {
    id: string;
    user_id: string;
    store_name: string;
    date: string;
    total: number;
    source: 'scan' | 'manual';
    group_id?: string;
    group_name?: string;
    splitwise_expense_id?: string;
    created_at: string;
    updated_at: string;
}

// GET: Retrieve user's expense history
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        if (!userId) {
            return NextResponse.json(
                { error: 'userId query parameter is required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseClient();
        const { data, error, count } = await supabase
            .from('expense_history')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching expense history:', error);
            return NextResponse.json(
                { error: 'Failed to fetch expense history', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: data || [],
            pagination: {
                total: count || 0,
                limit,
                offset,
                hasMore: (count || 0) > offset + limit
            }
        });
    } catch (error) {
        console.error('Error in expense history GET:', error);
        return NextResponse.json(
            { error: 'Failed to fetch expense history', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

// POST: Save a new expense to history
export async function POST(request: NextRequest) {
    try {
        let body;
        try {
            body = await request.json();
        } catch (parseError) {
            return NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        const { userId, storeName, date, total, source, groupId, groupName, splitwiseExpenseId } = body;

        if (!userId || !storeName || !date || total === undefined || !source) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, storeName, date, total, source' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseClient();
        const record: Partial<ExpenseHistoryRecord> = {
            user_id: String(userId),
            store_name: storeName,
            date: date,
            total: parseFloat(total),
            source: source as 'scan' | 'manual',
            group_id: groupId || null,
            group_name: groupName || null,
            splitwise_expense_id: splitwiseExpenseId || null,
        };

        const { data, error } = await supabase
            .from('expense_history')
            .insert(record)
            .select()
            .single();

        if (error) {
            console.error('Error saving expense history:', error);
            return NextResponse.json(
                { error: 'Failed to save expense history', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error in expense history POST:', error);
        return NextResponse.json(
            { error: 'Failed to save expense history', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

// DELETE: Remove an expense from history
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');

        if (!id || !userId) {
            return NextResponse.json(
                { error: 'id and userId query parameters are required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('expense_history')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            console.error('Error deleting expense history:', error);
            return NextResponse.json(
                { error: 'Failed to delete expense history', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in expense history DELETE:', error);
        return NextResponse.json(
            { error: 'Failed to delete expense history', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
