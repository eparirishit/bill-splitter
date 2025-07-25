import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SPLITWISE_CONFIG, APP_CONFIG } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const cookieStore = cookies();
    const accessToken = (await cookieStore).get(APP_CONFIG.AUTH_COOKIE_NAME)?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { groupId } = await params;

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    const response = await fetch(`${SPLITWISE_CONFIG.API_BASE_URL}/get_group/${groupId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch group' },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

