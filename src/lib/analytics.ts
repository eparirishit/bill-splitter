import { AI_SERVER_CONFIG } from '@/lib/config.server';
import { CorrectionTrackingService } from '@/services/correction-tracking';
import { FeedbackService } from '@/services/feedback-service';
import { ReceiptTrackingService } from '@/services/receipt-tracking';
import { UserTrackingService } from '@/services/user-tracking';
import { ExtractReceiptDataOutput, UserFeedback } from '@/types/analytics';

export class AnalyticsService {
  /**
   * Track user signin with Splitwise profile data
   */
  static async trackUserSignin(userId: string): Promise<void> {
    await UserTrackingService.trackUserSignin(userId);
  }

  /**
   * Track receipt processing from upload to completion
   */
  static async trackReceiptProcessing(
    userId: string,
    file: File | null,
    aiExtraction: ExtractReceiptDataOutput,
    processingTimeMs: number,
    aiModelVersion: string = AI_SERVER_CONFIG.GOOGLE_GEMINI.MODEL_NAME,
    aiProvider?: string,
    aiModelName?: string,
    aiTokensUsed?: number,
    aiProcessingTimeMs?: number,
    existingImageUrl?: string, // Optional: if image already uploaded, reuse the URL
    existingImageHash?: string, // Optional: hash if image already uploaded
    originalFilename?: string, // Optional: filename if file not provided
    fileSize?: number // Optional: file size if file not provided
  ): Promise<string> {
    // Track receipt processing
    const receiptId = await ReceiptTrackingService.trackReceiptProcessing(
      userId,
      file,
      aiExtraction,
      processingTimeMs,
      aiModelVersion,
      aiProvider,
      aiModelName,
      aiTokensUsed,
      aiProcessingTimeMs,
      existingImageUrl,
      existingImageHash,
      originalFilename,
      fileSize
    );

    // Increment user's receipt count
    await UserTrackingService.incrementReceiptProcessed(userId);

    return receiptId;
  }

  /**
   * Track user corrections and store patterns
   */
  static async trackCorrections(
    receiptId: string,
    userId: string,
    originalExtraction: ExtractReceiptDataOutput,
    userModifications: {
      items?: Array<{ name: string; price: number }>;
      taxes?: number;
      otherCharges?: number;
      totalCost?: number;
    }
  ): Promise<void> {
    // Calculate correction data
    const correctionData = CorrectionTrackingService.calculateCorrectionData(
      originalExtraction,
      userModifications
    );

    // Store corrections in receipt history
    await ReceiptTrackingService.updateWithCorrections(receiptId, correctionData);

    // Store correction patterns for AI training
    await CorrectionTrackingService.storeCorrectionPatterns(receiptId, correctionData);

    // Update user's correction count
    await UserTrackingService.incrementCorrectionsMade(userId, correctionData.correction_count);
  }

  /**
   * Submit user feedback
   */
  static async submitFeedback(
    receiptId: string,
    userId: string,
    feedback: Omit<UserFeedback, 'submitted_at'>
  ): Promise<void> {
    try {
      // Submit feedback
      await FeedbackService.submitFeedback(receiptId, feedback);

      // Calculate and update accuracy rating
      const accuracyScore = FeedbackService.calculateAccuracyScore({
        ...feedback,
        submitted_at: new Date()
      });

      await UserTrackingService.updateAccuracyRating(userId, accuracyScore);
    } catch (error) {
      console.warn('Failed to submit feedback to analytics:', error);
      // Don't throw error to prevent breaking the UI flow
    }
  }

  /**
   * Get comprehensive analytics for dashboard
   */
  static async getDashboardAnalytics() {
    const [
      userStats,
      processingStats,
      feedbackStats
    ] = await Promise.all([
      UserTrackingService.getAggregatedAnalytics(),
      ReceiptTrackingService.getProcessingStats(),
      FeedbackService.getFeedbackStats()
    ]);

    return {
      userStats,
      processingStats,
      feedbackStats
    };
  }

  /**
   * Get user-specific analytics
   */
  static async getUserAnalytics(userId: string) {
    const [
      userAnalytics,
      receiptHistory
    ] = await Promise.all([
      UserTrackingService.getUserAnalytics(userId),
      ReceiptTrackingService.getUserReceiptHistory(userId)
    ]);

    return {
      userAnalytics,
      receiptHistory
    };
  }

  /**
   * Get correction patterns for analysis
   */
  static async getCorrectionAnalysis(correctionType?: string) {
    const [
      correctionStats,
      correctionPatterns
    ] = await Promise.all([
      CorrectionTrackingService.getCorrectionStats(),
      CorrectionTrackingService.getCorrectionPatterns(correctionType)
    ]);

    return {
      correctionStats,
      correctionPatterns
    };
  }

  /**
   * Get feedback trends
   */
  static async getFeedbackTrends(days: number = 30) {
    return await FeedbackService.getFeedbackTrends(days);
  }

  /**
   * Delete user data (GDPR compliance)
   */
  static async deleteUserData(userId: string): Promise<void> {
    try {
      // Get all receipt IDs for the user
      const receiptHistory = await ReceiptTrackingService.getUserReceiptHistory(userId);

      // Delete all receipt records (this will also delete associated images)
      await Promise.all(
        receiptHistory.map(receipt =>
          ReceiptTrackingService.deleteReceiptRecord(receipt.id)
        )
      );

      // Note: User analytics record deletion would need to be implemented
      // based on your specific requirements for data retention
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }

  /**
   * Export user data (GDPR compliance)
   */
  static async exportUserData(userId: string) {
    const [
      userAnalytics,
      receiptHistory
    ] = await Promise.all([
      UserTrackingService.getUserAnalytics(userId),
      ReceiptTrackingService.getUserReceiptHistory(userId)
    ]);

    return {
      userAnalytics,
      receiptHistory,
      exportedAt: new Date().toISOString()
    };
  }
} 