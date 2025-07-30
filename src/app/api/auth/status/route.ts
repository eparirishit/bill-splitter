import { APP_CONFIG, SPLITWISE_CONFIG } from '@/lib/config';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(APP_CONFIG.AUTH_COOKIE_NAME)?.value;
  
  if (!accessToken) {
    return NextResponse.json({
      isAuthenticated: false
    });
  }

  try {
    // Get user info from Splitwise to get the userId
    const response = await fetch(`${SPLITWISE_CONFIG.API_BASE_URL}/get_current_user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const userData = await response.json();
      return NextResponse.json({
        isAuthenticated: true,
        userId: userData.user.id
      });
    } else {
      return NextResponse.json({
        isAuthenticated: false
      });
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({
      isAuthenticated: false
    });
  }
}
