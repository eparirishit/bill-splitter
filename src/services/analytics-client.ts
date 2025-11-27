/**
 * Client-side analytics service
 * Wraps analytics API calls for use in client components
 */

import type { ExtractReceiptDataOutput, UserFeedback } from '@/types/analytics';

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
}

