import { NextRequest, NextResponse } from 'next/server';
import { APP_CONFIG } from '@/lib/config';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  
  response.cookies.delete('sw_access_token');
  
  return response;
}

export async function GET() {
  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  
  response.cookies.delete(APP_CONFIG.AUTH_COOKIE_NAME);
  response.cookies.delete(APP_CONFIG.OAUTH_STATE_COOKIE_NAME);
  return response;
}
