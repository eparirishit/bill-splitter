import { UserTrackingService } from '@/services/user-tracking';
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

        const analytics = await UserTrackingService.getUserAnalytics(userId);

        if (!analytics) {
            return NextResponse.json(
                { error: 'User analytics not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: analytics });
    } catch (error) {
        console.error('Error fetching user analytics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user analytics', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
