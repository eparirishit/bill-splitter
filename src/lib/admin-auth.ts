import { APP_CONFIG, SPLITWISE_CONFIG } from '@/lib/config';
import { getSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';

export interface AdminUser {
    id: string; // Splitwise ID
    isAdmin: boolean;
}

export class AdminAuth {
    /**
     * Verifies if the current request is from an authenticated admin.
     * returning the user ID if successful, or throwing an error/returning null if not.
     */
    static async getAuthenticatedAdmin(): Promise<AdminUser | null> {
        try {
            const cookieStore = await cookies();
            const accessToken = cookieStore.get(APP_CONFIG.AUTH_COOKIE_NAME)?.value;

            if (!accessToken) {
                return null;
            }

            // 1. Verify with Splitwise to get the User ID
            // We can't trust the client to send the ID, we must fetch it from the provider using the token
            const swResponse = await fetch(`${SPLITWISE_CONFIG.API_BASE_URL}/get_current_user`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!swResponse.ok) {
                return null;
            }

            const swData = await swResponse.json();
            const userId = String(swData.user.id);

            // 2. Verify Admin Status in Supabase
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('user_analytics')
                .select('is_admin')
                .eq('user_id', userId)
                .single();

            if (error || !data || data.is_admin !== true) {
                return null;
            }

            return {
                id: userId,
                isAdmin: true
            };
        } catch (error) {
            console.error('Error verifying admin status:', error);
            return null;
        }
    }

    /**
     * Helper to verify admin status and throw if not authorized.
     * Useful for API routes to fail fast.
     */
    static async requireAdmin(): Promise<AdminUser> {
        const admin = await this.getAuthenticatedAdmin();
        if (!admin) {
            throw new Error('Unauthorized: Admin access required');
        }
        return admin;
    }
}
