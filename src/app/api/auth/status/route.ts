import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { APP_CONFIG } from '@/lib/config';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(APP_CONFIG.AUTH_COOKIE_NAME)?.value;
  
  return NextResponse.json({
    isAuthenticated: !!accessToken
  });
}
