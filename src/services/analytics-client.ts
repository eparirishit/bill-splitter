/**
 * Client-side analytics service
 * Wraps analytics API calls for use in client components.
 */

import type { ExtractReceiptDataOutput, UserFeedback, UserAnalytics } from '@/types/analytics';

interface TrackReceiptProcessingParams {
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
  bill_data?: any;
  created_at: string;
  updated_at: string;
}

interface SaveExpenseHistoryParams {
  storeName: string;
  date: string;
  total: number;
  source: 'scan' | 'manual';
  groupId?: string;
  groupName?: string;
  splitwiseExpenseId?: string;
  billData?: any;
}

interface UpdateExpenseHistoryParams {
  id: string;
  storeName?: string;
  date?: string;
  total?: number;
  source?: 'scan' | 'manual';
  groupId?: string;
  groupName?: string;
  splitwiseExpenseId?: string;
  billData?: any;
}

interface AggregatedAnalytics {
  total_users: number;
  total_receipts_processed: number;
  total_corrections_made: number;
  average_accuracy_rating: number;
  active_users_last_30_days: number;
  total_volume: number;
  manual_expenses_count: number;
  ocr_scans_count: number;
  accuracy_rate: number;
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
        credentials: 'include', // Ensure cookies are sent
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
   * Track user signin for analytics.
   * Server derives userId from the session cookie.
   */
  static async trackUserSignin(): Promise<void> {
    try {
      await this.makeApiRequest('/api/analytics/track-signin', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    } catch (error) {
      // Log but don't throw - analytics failures shouldn't break the app
      console.warn('Failed to track user signin:', error);
    }
  }

  /**
   * Track receipt processing for analytics
   * @param params - Receipt processing parameters (userId derived server-side)
   * @returns Receipt ID if successful
   */
  static async trackReceiptProcessing(
    params: TrackReceiptProcessingParams
  ): Promise<string | undefined> {
    try {
      const response = await this.makeApiRequest('/api/analytics/track-receipt', {
        method: 'POST',
        body: JSON.stringify({
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
   * @param originalExtraction - Original AI extraction
   * @param userModifications - User's modifications
   */
  static async trackCorrections(
    receiptId: string,
    originalExtraction: ExtractReceiptDataOutput,
    userModifications: {
      items?: Array<{ name: string; price: number }>;
      taxes?: number;
      otherCharges?: number;
      totalCost?: number;
    }
  ): Promise<void> {
    try {
      await this.makeApiRequest('/api/analytics/track-corrections', {
        method: 'POST',
        body: JSON.stringify({
          receiptId,
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
   * @param params - Feedback parameters (userId derived server-side)
   */
  static async submitFeedback(params: SubmitFeedbackParams): Promise<void> {
    try {
      await this.makeApiRequest('/api/analytics/submit-feedback', {
        method: 'POST',
        body: JSON.stringify({
          receiptId: params.receiptId,
          feedback: params.feedback,
        }),
      });
    } catch (error) {
      // Log but don't throw - analytics failures shouldn't break the app
      console.warn('Failed to submit feedback:', error);
    }
  }

  /**
   * Get user analytics data.
   * If targetUserId is provided (admin use), fetches that user's analytics.
   * Otherwise, server derives userId from the session cookie.
   * @param targetUserId - Optional user ID to look up (admin only)
   * @returns User analytics or null if not found
   */
  static async getUserAnalytics(targetUserId?: string): Promise<UserAnalytics | null> {
    try {
      const endpoint = targetUserId
        ? `/api/analytics/get-user-analytics?targetUserId=${encodeURIComponent(targetUserId)}`
        : `/api/analytics/get-user-analytics`;
      const response = await this.makeApiRequest(endpoint);
      return response.data || null;
    } catch (error) {
      console.warn('Failed to get user analytics:', error);
      return null;
    }
  }

  /**
   * Get user-specific expense counts (scan, manual, volumes).
   * Server derives userId from the session cookie.
   * @returns Expense counts and volumes
   */
  static async getUserExpenseCounts(): Promise<{
    scanCount: number;
    manualCount: number;
    totalVolume: number;
    monthlyVolume: number;
  } | null> {
    try {
      const response = await this.makeApiRequest(
        `/api/analytics/get-user-expense-counts`
      );
      return response.data || null;
    } catch (error) {
      console.warn('Failed to get user expense counts:', error);
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
   * Get user's expense history.
   * Server derives userId from the session cookie.
   * @param limit - Number of records to fetch (default: 20)
   * @param offset - Offset for pagination (default: 0)
   * @returns Expense history with pagination
   */
  static async getExpenseHistory(
    limit: number = 20,
    offset: number = 0
  ): Promise<ExpenseHistoryResponse | null> {
    try {
      const response = await this.makeApiRequest(
        `/api/expense-history?limit=${limit}&offset=${offset}`
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
   * Save a new expense to history.
   * Server derives userId from the session cookie.
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
   * Get a single expense by ID.
   * Server derives userId from the session cookie.
   * @param id - Expense ID
   * @returns Expense record or null
   */
  static async getExpenseById(id: string): Promise<ExpenseHistoryRecord | null> {
    try {
      const response = await this.makeApiRequest(
        `/api/expense-history?id=${encodeURIComponent(id)}`
      );
      return response.data || null;
    } catch (error) {
      console.warn('Failed to get expense by ID:', error);
      return null;
    }
  }

  /**
   * Update an existing expense.
   * Server derives userId from the session cookie.
   * @param params - Update parameters
   * @returns Updated expense record or null
   */
  static async updateExpenseHistory(params: UpdateExpenseHistoryParams): Promise<ExpenseHistoryRecord | null> {
    try {
      const response = await this.makeApiRequest('/api/expense-history', {
        method: 'PUT',
        body: JSON.stringify(params),
      });
      return response.data || null;
    } catch (error) {
      console.warn('Failed to update expense history:', error);
      return null;
    }
  }

  /**
   * Delete an expense from history.
   * Server derives userId from the session cookie.
   * @param id - Expense ID
   * @returns Success boolean
   */
  static async deleteExpenseHistory(id: string): Promise<boolean> {
    try {
      await this.makeApiRequest(
        `/api/expense-history?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );
      return true;
    } catch (error) {
      console.warn('Failed to delete expense history:', error);
      return false;
    }
  }

  /**
   * Check if the current user is an admin.
   * Server derives userId from the session cookie.
   * @returns True if user is admin, false otherwise
   */
  static async checkAdminStatus(): Promise<boolean> {
    try {
      const response = await this.makeApiRequest(
        `/api/analytics/check-admin`
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
