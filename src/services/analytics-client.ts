/**
 * Client-side analytics service
 * Wraps analytics API calls for use in client components
 */

import type { ExtractReceiptDataOutput, UserFeedback, UserAnalytics } from '@/types/analytics';

interface TrackReceiptProcessingParams {
  userId: string;
  aiExtraction: ExtractReceiptDataOutput;
  processingTimeMs: number;
  aiModelVersion?: string;
  aiProvider?: string;
  aiModelName?: string;
  aiTokensUsed?: number;
  aiProcessingTimeMs?: number;
  existingImageUrl: string;
  existingImageHash?: string;
  originalFilename?: string;
  fileSize?: number;
}

interface SubmitFeedbackParams {
  receiptId: string;
  userId: string;
  feedback: Omit<UserFeedback, 'submitted_at'>;
}

interface ExpenseHistoryRecord {
  id: string;
  user_id: string;
  store_name: string;
  date: string;
  total: number;
  source: 'scan' | 'manual';
  group_id?: string;
  group_name?: string;
  splitwise_expense_id?: string;
  created_at: string;
  updated_at: string;
}

interface SaveExpenseHistoryParams {
  userId: string;
  storeName: string;
  date: string;
  total: number;
  source: 'scan' | 'manual';
  groupId?: string;
  groupName?: string;
  splitwiseExpenseId?: string;
}

interface AggregatedAnalytics {
  total_users: number;
  total_receipts_processed: number;
  total_corrections_made: number;
  average_accuracy_rating: number;
  active_users_last_30_days: number;
  total_volume: number;
}

interface ExpenseHistoryResponse {
  data: ExpenseHistoryRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export class AnalyticsClientService {
  /**
   * Make an API request with consistent error handling
   */
  private static async makeApiRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`
        }));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Network error: ${String(error)}`);
    }
  }

  /**
   * Track user signin for analytics
   * @param userId - User ID (can be number or string, will be converted to string)
   */
  static async trackUserSignin(userId: string | number): Promise<void> {
    try {
      const userIdString = String(userId);
      await this.makeApiRequest('/api/analytics/track-signin', {
        method: 'POST',
        body: JSON.stringify({ userId: userIdString }),
      });
    } catch (error) {
      // Log but don't throw - analytics failures shouldn't break the app
      console.warn('Failed to track user signin:', error);
    }
  }

  /**
   * Track receipt processing for analytics
   * @param params - Receipt processing parameters
   * @returns Receipt ID if successful
   */
  static async trackReceiptProcessing(
    params: TrackReceiptProcessingParams
  ): Promise<string | undefined> {
    try {
      const response = await this.makeApiRequest('/api/analytics/track-receipt', {
        method: 'POST',
        body: JSON.stringify({
          userId: params.userId,
          aiExtraction: params.aiExtraction,
          processingTimeMs: params.processingTimeMs,
          aiModelVersion: params.aiModelVersion,
          aiProvider: params.aiProvider,
          aiModelName: params.aiModelName,
          aiTokensUsed: params.aiTokensUsed,
          aiProcessingTimeMs: params.aiProcessingTimeMs,
          existingImageUrl: params.existingImageUrl,
          existingImageHash: params.existingImageHash,
          originalFilename: params.originalFilename,
          fileSize: params.fileSize,
        }),
      });

      return response.receiptId;
    } catch (error) {
      // Log but don't throw - analytics failures shouldn't break the app
      console.warn('Failed to track receipt processing:', error);
      return undefined;
    }
  }

  /**
   * Track user corrections when they modify receipt data
   * @param receiptId - Receipt ID from tracking
   * @param userId - User ID
   * @param originalExtraction - Original AI extraction
   * @param userModifications - User's modifications
   */
  static async trackCorrections(
    receiptId: string,
    userId: string | number,
    originalExtraction: ExtractReceiptDataOutput,
    userModifications: {
      items?: Array<{ name: string; price: number }>;
      taxes?: number;
      otherCharges?: number;
      totalCost?: number;
    }
  ): Promise<void> {
    try {
      const userIdString = String(userId);
      await this.makeApiRequest('/api/analytics/track-corrections', {
        method: 'POST',
        body: JSON.stringify({
          receiptId,
          userId: userIdString,
          originalExtraction,
          userModifications,
        }),
      });
    } catch (error) {
      // Log but don't throw - analytics failures shouldn't break the app
      console.warn('Failed to track corrections:', error);
    }
  }

  /**
   * Submit user feedback
   * @param params - Feedback parameters
   */
  static async submitFeedback(params: SubmitFeedbackParams): Promise<void> {
    try {
      // Validate required parameters
      if (!params.userId) {
        console.error('submitFeedback called without userId:', params);
        throw new Error('userId is required for feedback submission');
      }

      // Ensure userId is a string (can be number from Splitwise)
      const userIdString = String(params.userId);

      await this.makeApiRequest('/api/analytics/submit-feedback', {
        method: 'POST',
        body: JSON.stringify({
          receiptId: params.receiptId,
          userId: userIdString,
          feedback: params.feedback,
        }),
      });
    } catch (error) {
      // Log but don't throw - analytics failures shouldn't break the app
      console.warn('Failed to submit feedback:', error);
    }
  }

  /**
   * Get user analytics data
   * @param userId - User ID
   * @returns User analytics or null if not found
   */
  static async getUserAnalytics(userId: string | number): Promise<UserAnalytics | null> {
    try {
      const userIdString = String(userId);
      const response = await this.makeApiRequest(
        `/api/analytics/get-user-analytics?userId=${encodeURIComponent(userIdString)}`
      );
      return response.data || null;
    } catch (error) {
      console.warn('Failed to get user analytics:', error);
      return null;
    }
  }

  /**
   * Get aggregated analytics for admin dashboard
   * @param days - Date range string (e.g., '7d', '30d', '90d', 'all')
   * @returns Aggregated analytics data
   */
  static async getAggregatedAnalytics(days?: string): Promise<AggregatedAnalytics | null> {
    try {
      const endpoint = days ? `/api/analytics/get-aggregated?days=${days}` : '/api/analytics/get-aggregated';
      const response = await this.makeApiRequest(endpoint);
      return response.data || null;
    } catch (error) {
      console.warn('Failed to get aggregated analytics:', error);
      return null;
    }
  }

  /**
   * Get user's expense history
   * @param userId - User ID
   * @param limit - Number of records to fetch (default: 20)
   * @param offset - Offset for pagination (default: 0)
   * @returns Expense history with pagination
   */
  static async getExpenseHistory(
    userId: string | number,
    limit: number = 20,
    offset: number = 0
  ): Promise<ExpenseHistoryResponse | null> {
    try {
      const userIdString = String(userId);
      const response = await this.makeApiRequest(
        `/api/expense-history?userId=${encodeURIComponent(userIdString)}&limit=${limit}&offset=${offset}`
      );
      return {
        data: response.data || [],
        pagination: response.pagination || { total: 0, limit, offset, hasMore: false }
      };
    } catch (error) {
      console.warn('Failed to get expense history:', error);
      return null;
    }
  }

  /**
   * Save a new expense to history
   * @param params - Expense details
   * @returns Created expense record
   */
  static async saveExpenseHistory(params: SaveExpenseHistoryParams): Promise<ExpenseHistoryRecord | null> {
    try {
      const response = await this.makeApiRequest('/api/expense-history', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      return response.data || null;
    } catch (error) {
      console.warn('Failed to save expense history:', error);
      return null;
    }
  }

  /**
   * Delete an expense from history
   * @param id - Expense ID
   * @param userId - User ID (for authorization)
   * @returns Success boolean
   */
  static async deleteExpenseHistory(id: string, userId: string | number): Promise<boolean> {
    try {
      const userIdString = String(userId);
      await this.makeApiRequest(
        `/api/expense-history?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userIdString)}`,
        { method: 'DELETE' }
      );
      return true;
    } catch (error) {
      console.warn('Failed to delete expense history:', error);
      return false;
    }
  }

  /**
   * Check if a user is an admin
   * @param userId - User ID
   * @returns True if user is admin, false otherwise
   */
  static async checkAdminStatus(userId: string | number): Promise<boolean> {
    try {
      const userIdString = String(userId);
      const response = await this.makeApiRequest(
        `/api/analytics/check-admin?userId=${encodeURIComponent(userIdString)}`
      );
      return response.isAdmin === true;
    } catch (error) {
      console.warn('Failed to check admin status:', error);
      return false;
    }
  }

  /**
   * Submit general feedback or support request
   * @param params - Feedback parameters
   * @returns Request ID if successful
   */
  static async submitSupportRequest(params: {
    type: 'bug' | 'feature' | 'general' | 'support';
    message: string;
    user?: {
      id?: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      name?: string;
    };
  }): Promise<string | undefined> {
    try {
      const response = await this.makeApiRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type: params.type,
          message: params.message,
          user: params.user
        }),
      });
      return response.requestId;
    } catch (error) {
      console.warn('Failed to submit support request:', error);
      return undefined;
    }
  }
}


