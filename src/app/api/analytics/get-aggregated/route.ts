import { UserTrackingService } from '@/services/user-tracking';
import { NextResponse, NextRequest } from 'next/server';
import { AdminAuth } from '@/lib/admin-auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        // Require admin access
        await AdminAuth.requireAdmin();

        const { searchParams } = new URL(request.url);
        const days = searchParams.get('days') || undefined;

        const supabase = getSupabaseClient();

        // 1. Get Aggregated Analytics from UserTrackingService
        const aggregatedData = await UserTrackingService.getAggregatedAnalytics(days);

        // 2. Calculate REAL Total Volume from expense_history with filter
        let query = supabase.from('expense_history').select('total');

        if (days && days !== 'all') {
            const numDays = parseInt(days.replace('d', ''));
            if (!isNaN(numDays)) {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - numDays);
                query = query.gte('date', startDate.toISOString().split('T')[0]); // expense_history has 'date' column
            }
        }

        const { data: expenseData, error: expenseError } = await query;

        let realTotalVolume = 0;
        if (!expenseError && expenseData) {
            realTotalVolume = expenseData.reduce((sum, item) => sum + (item.total || 0), 0);
        }

        return NextResponse.json({
            success: true,
            data: {
                ...aggregatedData,
                total_volume: realTotalVolume // Overlay the real volume
            }
        });
    } catch (error) {
        console.error('Error fetching aggregated analytics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch aggregated analytics', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
