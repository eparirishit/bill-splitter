import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SPLITWISE_CONFIG, APP_CONFIG } from '@/lib/config';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const cookieStore = await cookies();
  const storedState = cookieStore.get('oauth_state')?.value;

  if (error) {
    console.error('Splitwise callback error:', error);
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=${encodeURIComponent(error)}`);
  }

  if (!state || state !== storedState) {
    console.error('Invalid OAuth state');
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=invalid_state`);
  }

  if (!code) {
    console.error('No code received');
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=no_code`);
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', SPLITWISE_CONFIG.REDIRECT_URI);
    params.append('client_id', SPLITWISE_CONFIG.CLIENT_ID);
    params.append('client_secret', SPLITWISE_CONFIG.CLIENT_SECRET);

    const tokenResponse = await fetch(SPLITWISE_CONFIG.TOKEN_URL, {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Error exchanging token:', tokenData.error || `Status ${tokenResponse.status}`);
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=${encodeURIComponent(tokenData.error || 'token_exchange_failed')}`);
    }

    // Set the access token in an HttpOnly cookie and clear the state cookie
    const response = NextResponse.redirect(request.nextUrl.origin);
    
    // Clear the state cookie
    response.cookies.delete(APP_CONFIG.OAUTH_STATE_COOKIE_NAME);
    
    // Set the access token
    response.cookies.set(APP_CONFIG.AUTH_COOKIE_NAME, tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokenData.expires_in ? tokenData.expires_in * 1000 : 3600 * 1000,
      sameSite: 'lax'
    });

    return response;
  } catch (err) {
    console.error('Exception during token exchange:', err);
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=server_exception`);
  }
}
