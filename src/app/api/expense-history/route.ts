import { getAuthenticatedUser } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET: Retrieve user's expense history or a single expense by ID
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const supabase = getSupabaseClient();

        // If ID is provided, fetch single expense
        if (id) {
            const { data, error } = await supabase
                .from('expense_history')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.userId)
                .single();

            if (error) {
                console.error('Error fetching expense:', error);
                return NextResponse.json(
                    { error: 'Failed to fetch expense' },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                data: data || null
            });
        }

        // Otherwise, fetch list of expenses
        const { data, error, count } = await supabase
            .from('expense_history')
            .select('*', { count: 'exact' })
            .eq('user_id', user.userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching expense history:', error);
            return NextResponse.json(
                { error: 'Failed to fetch expense history' },
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
            { error: 'Failed to fetch expense history' },
            { status: 500 }
        );
    }
}

// POST: Save a new expense to history
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body;
        try {
            body = await request.json();
        } catch (parseError) {
            return NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        const { storeName, date, total, source, groupId, groupName, splitwiseExpenseId, billData } = body;

        if (!storeName || !date || total === undefined || !source) {
            return NextResponse.json(
                { error: 'Missing required fields: storeName, date, total, source' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseClient();
        const record = {
            user_id: user.userId,
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
                { error: 'Failed to save expense history' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error in expense history POST:', error);
        return NextResponse.json(
            { error: 'Failed to save expense history' },
            { status: 500 }
        );
    }
}

// PUT: Update an existing expense
export async function PUT(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body;
        try {
            body = await request.json();
        } catch (parseError) {
            return NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        const { id, storeName, date, total, source, groupId, groupName, splitwiseExpenseId, billData } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'id is required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseClient();
        const updateData: Record<string, any> = {};

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
            .eq('user_id', user.userId)
            .select()
            .single();

        if (error) {
            console.error('Error updating expense history:', error);
            return NextResponse.json(
                { error: 'Failed to update expense history' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error in expense history PUT:', error);
        return NextResponse.json(
            { error: 'Failed to update expense history' },
            { status: 500 }
        );
    }
}

// DELETE: Remove an expense from history
export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'id query parameter is required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('expense_history')
            .delete()
            .eq('id', id)
            .eq('user_id', user.userId);

        if (error) {
            console.error('Error deleting expense history:', error);
            return NextResponse.json(
                { error: 'Failed to delete expense history' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in expense history DELETE:', error);
        return NextResponse.json(
            { error: 'Failed to delete expense history' },
            { status: 500 }
        );
    }
}
