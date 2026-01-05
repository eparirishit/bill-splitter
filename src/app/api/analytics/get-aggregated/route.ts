import { UserTrackingService } from '@/services/user-tracking';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const aggregatedData = await UserTrackingService.getAggregatedAnalytics();

        return NextResponse.json({ success: true, data: aggregatedData });
    } catch (error) {
        console.error('Error fetching aggregated analytics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch aggregated analytics', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
