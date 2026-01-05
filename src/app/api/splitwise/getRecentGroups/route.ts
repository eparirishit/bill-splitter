import { APP_CONFIG, SPLITWISE_CONFIG } from '@/lib/config';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(APP_CONFIG.AUTH_COOKIE_NAME)?.value;

    if (!accessToken) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        const response = await fetch(`${SPLITWISE_CONFIG.API_BASE_URL}/get_groups`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Splitwise API error:', response.status, errorData);
            return NextResponse.json(
                { error: errorData.error || 'Failed to fetch groups from Splitwise' },
                { status: response.status }
            );
        }

        const data = await response.json();
        let groups = data.groups || [];

        // Sort by updated_at descending
        groups.sort((a: any, b: any) => {
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });

        // Take top 5
        const recentGroups = groups.slice(0, 5);

        return NextResponse.json({ groups: recentGroups });
    } catch (error) {
        console.error('Error fetching recent groups:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
