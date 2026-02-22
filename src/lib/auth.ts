import 'server-only';

import { APP_CONFIG, SPLITWISE_CONFIG } from '@/lib/config';
import { cookies } from 'next/headers';

export interface AuthenticatedUser {
  userId: string;
}

/**
 * Verifies the current request is from an authenticated user by reading the
 * Splitwise OAuth access token from the HTTP-only cookie and validating it
 * against the Splitwise API.
 *
 * @returns The verified user (with their Splitwise user ID) or `null` if not authenticated.
 *
 * IMPORTANT: This must only be called inside Next.js App Router server
 * contexts (API route handlers, Server Components, Server Actions) where
 * `cookies()` from `next/headers` is available.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(APP_CONFIG.AUTH_COOKIE_NAME)?.value;

    if (!accessToken) {
      return null;
    }

    const response = await fetch(
      `${SPLITWISE_CONFIG.API_BASE_URL}/get_current_user`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const userId = data?.user?.id;

    if (userId === undefined || userId === null) {
      return null;
    }

    return { userId: String(userId) };
  } catch (error) {
    console.error('Error verifying user authentication:', error);
    return null;
  }
}

/**
 * Convenience helper that returns an authenticated user or throws.
 * Use in API routes that should always require authentication.
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
