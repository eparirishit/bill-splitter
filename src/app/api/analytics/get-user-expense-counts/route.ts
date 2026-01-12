import { getSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId query parameter is required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseClient();

        // Get all expenses for the user to calculate counts
        const { data, error } = await supabase
            .from('expense_history')
            .select('source, total, date')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching expense counts:', error);
            return NextResponse.json(
                { error: 'Failed to fetch expense counts', details: error.message },
                { status: 500 }
            );
        }

        // Calculate counts and volumes
        const scanCount = data?.filter(e => e.source === 'scan').length || 0;
        const manualCount = data?.filter(e => e.source === 'manual').length || 0;
        const totalVolume = data?.reduce((sum, e) => sum + (e.total || 0), 0) || 0;
        
        // Calculate monthly volume
        const now = new Date();
        const monthlyVolume = data?.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).reduce((sum, e) => sum + (e.total || 0), 0) || 0;

        return NextResponse.json({
            success: true,
            data: {
                scanCount,
                manualCount,
                totalVolume,
                monthlyVolume
            }
        });
    } catch (error) {
        console.error('Error in get-user-expense-counts GET:', error);
        return NextResponse.json(
            { error: 'Failed to fetch expense counts', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

