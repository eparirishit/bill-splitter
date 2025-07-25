import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { APP_CONFIG } from '@/lib/config';

export interface AuthenticatedRequest extends NextRequest {
  accessToken: string;
}

export function withAuth<T extends any[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const cookieStore = cookies();
      const accessToken = (await cookieStore).get(APP_CONFIG.AUTH_COOKIE_NAME)?.value;

      if (!accessToken) {
        return NextResponse.json(
          { error: 'Authentication required', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }

      const authenticatedRequest = Object.assign(request, { accessToken });
      return await handler(authenticatedRequest, ...args);
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed', code: 'AUTH_FAILED' },
        { status: 401 }
      );
    }
  };
}

export function createAPIError(
  message: string,
  code: string,
  status: number = 500,
  details?: unknown
) {
  return NextResponse.json(
    { 
      error: message, 
      code, 
      details: process.env.NODE_ENV === 'development' ? details : undefined 
    },
    { status }
  );
}
