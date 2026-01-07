import { getSupabaseClient } from '@/lib/supabase';
import { SplitwiseService } from '@/services/splitwise';
import { UserAnalytics } from '@/types/analytics';

export class UserTrackingService {
  /**
   * Track user signin and update analytics with Splitwise profile data
   */
  static async trackUserSignin(userId: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const now = new Date().toISOString();

      // Get user profile from Splitwise
      let userProfile = null;
      if (typeof window !== 'undefined') {
        // Only fetch user profile on client-side where relative URLs work
        // On server-side, we skip this to avoid "Failed to parse URL" errors
        try {
          const splitwiseUser = await SplitwiseService.getCurrentUser();
          userProfile = {
            first_name: splitwiseUser.first_name,
            last_name: splitwiseUser.last_name,
            email: splitwiseUser.email,
            registration_status: splitwiseUser.registration_status,
            profile_picture_url: splitwiseUser.picture?.medium,
            account_created_at: new Date() // Note: Splitwise doesn't provide account creation date
          };
        } catch (error) {
          console.warn('Could not fetch Splitwise user profile (continuing without it):',
            error instanceof Error ? error.message : String(error));
        }
      } else {
        // Server-side: userId is already available, no need to fetch profile
      }

      // Check if user analytics record exists
      const { data: existingRecord } = await supabase
        .from('user_analytics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingRecord) {
        // Update existing record
        const updateData: any = {
          last_signin: now,
          total_sessions: existingRecord.total_sessions + 1,
          updated_at: now
        };

        // Only update profile data if we don't have it yet
        if (!existingRecord.user_profile && userProfile) {
          updateData.user_profile = userProfile;
        }

        await supabase
          .from('user_analytics')
          .update(updateData)
          .eq('user_id', userId);
      } else {
        // Create new record
        const insertData: any = {
          user_id: userId,
          first_signin: now,
          last_signin: now,
          total_sessions: 1,
          total_receipts_processed: 0,
          total_corrections_made: 0,
          average_accuracy_rating: null
        };

        if (userProfile) {
          insertData.user_profile = userProfile;
        }

        await supabase
          .from('user_analytics')
          .insert(insertData);
      }
    } catch (error) {
      console.error('Error tracking user signin:', error);
      // Don't throw error to avoid breaking the signin flow
    }
  }

  /**
   * Increment receipt processing count for a user
   */
  static async incrementReceiptProcessed(userId: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const { data: existingRecord } = await supabase
        .from('user_analytics')
        .select('total_receipts_processed')
        .eq('user_id', userId)
        .single();

      if (existingRecord) {
        await supabase
          .from('user_analytics')
          .update({
            total_receipts_processed: existingRecord.total_receipts_processed + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Error incrementing receipt processed count:', error);
    }
  }

  /**
   * Increment corrections count for a user
   */
  static async incrementCorrectionsMade(userId: string, correctionCount: number = 1): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const { data: existingRecord } = await supabase
        .from('user_analytics')
        .select('total_corrections_made')
        .eq('user_id', userId)
        .single();

      if (existingRecord) {
        await supabase
          .from('user_analytics')
          .update({
            total_corrections_made: existingRecord.total_corrections_made + correctionCount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Error incrementing corrections count:', error);
    }
  }

  /**
   * Update user's average accuracy rating
   */
  static async updateAccuracyRating(userId: string, newRating: number): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const { data: existingRecord } = await supabase
        .from('user_analytics')
        .select('average_accuracy_rating, total_receipts_processed')
        .eq('user_id', userId)
        .single();

      if (existingRecord) {
        const currentTotal = existingRecord.average_accuracy_rating * existingRecord.total_receipts_processed;
        const newTotal = currentTotal + newRating;
        const newAverage = newTotal / (existingRecord.total_receipts_processed + 1);

        await supabase
          .from('user_analytics')
          .update({
            average_accuracy_rating: Math.round(newAverage * 100) / 100, // Round to 2 decimal places
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Error updating accuracy rating:', error);
    }
  }



  /**
   * Update user's performance metrics
   */
  static async updatePerformanceMetrics(userId: string, processingTimeMs: number): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const { data: existingRecord } = await supabase
        .from('user_analytics')
        .select('performance_metrics')
        .eq('user_id', userId)
        .single();

      if (existingRecord) {
        const currentMetrics = existingRecord.performance_metrics || {
          average_processing_time_ms: 0,
          total_processing_time_ms: 0,
          fastest_processing_time_ms: 0,
          slowest_processing_time_ms: 0
        };

        const newTotalTime = currentMetrics.total_processing_time_ms + processingTimeMs;
        const newCount = (newTotalTime / currentMetrics.average_processing_time_ms) || 1;
        const newAverage = newTotalTime / newCount;

        const newMetrics = {
          average_processing_time_ms: Math.round(newAverage),
          total_processing_time_ms: newTotalTime,
          fastest_processing_time_ms: Math.min(currentMetrics.fastest_processing_time_ms || processingTimeMs, processingTimeMs),
          slowest_processing_time_ms: Math.max(currentMetrics.slowest_processing_time_ms || processingTimeMs, processingTimeMs)
        };

        await supabase
          .from('user_analytics')
          .update({
            performance_metrics: newMetrics,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Error updating performance metrics:', error);
    }
  }

  /**
   * Get user analytics
   */
  static async getUserAnalytics(userId: string): Promise<UserAnalytics | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('user_analytics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user analytics:', error);
        return null;
      }

      return data ? {
        ...data,
        first_signin: new Date(data.first_signin),
        last_signin: new Date(data.last_signin),
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at)
      } : null;
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return null;
    }
  }

  /**
   * Get aggregated analytics for admin dashboard
   * @param days - Optional date range to filter by
   */
  static async getAggregatedAnalytics(days?: string): Promise<{
    total_users: number;
    total_receipts_processed: number;
    total_corrections_made: number;
    average_accuracy_rating: number;
    active_users_last_30_days: number;
  }> {
    try {
      const supabase = getSupabaseClient();
      // Get total users
      const { count: totalUsers } = await supabase
        .from('user_analytics')
        .select('*', { count: 'exact', head: true });

      // Get total receipts processed
      const { data: receiptsData } = await supabase
        .from('user_analytics')
        .select('total_receipts_processed');

      const totalReceipts = receiptsData?.reduce((sum, record) => sum + record.total_receipts_processed, 0) || 0;

      // Get total corrections
      const { data: correctionsData } = await supabase
        .from('user_analytics')
        .select('total_corrections_made');

      const totalCorrections = correctionsData?.reduce((sum, record) => sum + record.total_corrections_made, 0) || 0;

      // Get average accuracy rating
      const { data: accuracyData } = await supabase
        .from('user_analytics')
        .select('average_accuracy_rating')
        .not('average_accuracy_rating', 'is', null);

      const averageAccuracy = accuracyData && accuracyData.length > 0
        ? accuracyData.reduce((sum, record) => sum + (record.average_accuracy_rating || 0), 0) / accuracyData.length
        : 0;

      // Get active users in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: activeUsers } = await supabase
        .from('user_analytics')
        .select('*', { count: 'exact', head: true })
        .gte('last_signin', thirtyDaysAgo.toISOString());

      return {
        total_users: totalUsers || 0,
        total_receipts_processed: totalReceipts,
        total_corrections_made: totalCorrections,
        average_accuracy_rating: Math.round(averageAccuracy * 100) / 100,
        active_users_last_30_days: activeUsers || 0
      };
    } catch (error) {
      console.error('Error getting aggregated analytics:', error);
      return {
        total_users: 0,
        total_receipts_processed: 0,
        total_corrections_made: 0,
        average_accuracy_rating: 0,
        active_users_last_30_days: 0
      };
    }
  }
} 