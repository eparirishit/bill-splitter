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
    bill_data?: any;
    created_at: string;
    updated_at: string;
}

// GET: Retrieve user's expense history or a single expense by ID
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const supabase = getSupabaseClient();

        // If ID is provided, fetch single expense
        if (id) {
            if (!userId) {
                return NextResponse.json(
                    { error: 'userId query parameter is required when fetching by id' },
                    { status: 400 }
                );
            }

            const { data, error } = await supabase
                .from('expense_history')
                .select('*')
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (error) {
                console.error('Error fetching expense:', error);
                return NextResponse.json(
                    { error: 'Failed to fetch expense', details: error.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                data: data || null
            });
        }

        // Otherwise, fetch list of expenses
        if (!userId) {
            return NextResponse.json(
                { error: 'userId query parameter is required' },
                { status: 400 }
            );
        }

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

        const { userId, storeName, date, total, source, groupId, groupName, splitwiseExpenseId, billData } = body;

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
            bill_data: billData || null,
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

// PUT: Update an existing expense
export async function PUT(request: NextRequest) {
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

        const { id, userId, storeName, date, total, source, groupId, groupName, splitwiseExpenseId, billData } = body;

        if (!id || !userId) {
            return NextResponse.json(
                { error: 'id and userId are required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseClient();
        const updateData: Partial<ExpenseHistoryRecord> = {};

        if (storeName !== undefined) updateData.store_name = storeName;
        if (date !== undefined) updateData.date = date;
        if (total !== undefined) updateData.total = parseFloat(total);
        if (source !== undefined) updateData.source = source as 'scan' | 'manual';
        if (groupId !== undefined) updateData.group_id = groupId || null;
        if (groupName !== undefined) updateData.group_name = groupName || null;
        if (splitwiseExpenseId !== undefined) updateData.splitwise_expense_id = splitwiseExpenseId || null;
        if (billData !== undefined) updateData.bill_data = billData || null;

        const { data, error } = await supabase
            .from('expense_history')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            console.error('Error updating expense history:', error);
            return NextResponse.json(
                { error: 'Failed to update expense history', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error in expense history PUT:', error);
        return NextResponse.json(
            { error: 'Failed to update expense history', details: error instanceof Error ? error.message : String(error) },
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
