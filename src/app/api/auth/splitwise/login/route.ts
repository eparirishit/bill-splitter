import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { SPLITWISE_CONFIG, APP_CONFIG } from '@/lib/config';

export async function GET() {
  const state = crypto.randomBytes(16).toString('hex');
  
  const authUrl = new URL(SPLITWISE_CONFIG.AUTHORIZE_URL);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', SPLITWISE_CONFIG.CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', SPLITWISE_CONFIG.REDIRECT_URI);
  authUrl.searchParams.append('state', state);

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set(APP_CONFIG.OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes
    sameSite: 'lax'
  });

  return response;
}
