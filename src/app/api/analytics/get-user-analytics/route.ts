import { getAuthenticatedUser } from '@/lib/auth';
import { AdminAuth } from '@/lib/admin-auth';
import { UserTrackingService } from '@/services/user-tracking';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const targetUserId = searchParams.get('targetUserId');

        // If targetUserId is provided, this is an admin looking up another user
        let userId = user.userId;
        if (targetUserId && targetUserId !== user.userId) {
            // Require admin privileges to view other users' analytics
            const admin = await AdminAuth.getAuthenticatedAdmin();
            if (!admin) {
                return NextResponse.json(
                    { error: 'Admin privileges required to view other users\' analytics' },
                    { status: 403 }
                );
            }
            userId = targetUserId;
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
            { error: 'Failed to fetch user analytics' },
            { status: 500 }
        );
    }
}
