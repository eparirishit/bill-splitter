import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SPLITWISE_CONFIG, APP_CONFIG } from '@/lib/config';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(APP_CONFIG.AUTH_COOKIE_NAME)?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const response = await fetch(`${SPLITWISE_CONFIG.API_BASE_URL}/get_current_user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch user' },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
