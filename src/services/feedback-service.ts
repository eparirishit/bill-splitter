import { supabase } from '@/lib/supabase';
import { UserFeedback } from '@/types/analytics';

export class FeedbackService {
  /**
   * Submit user feedback for a receipt
   */
  static async submitFeedback(
    receiptId: string,
    feedback: Omit<UserFeedback, 'submitted_at'>
  ): Promise<void> {
    try {
      const feedbackWithTimestamp: UserFeedback = {
        ...feedback,
        submitted_at: new Date()
      };

      // Update existing record with feedback
      const { error } = await supabase
        .from('receipt_processing_history')
        .update({
          feedback: feedbackWithTimestamp,
          updated_at: new Date().toISOString()
        })
        .eq('id', receiptId);

      if (error) {
        console.error('Error updating feedback:', error);
        throw new Error(`Failed to update feedback: ${error.message}`);
      }

      console.log('Feedback submitted successfully for receipt:', receiptId);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  /**
   * Get feedback statistics
   */
  static async getFeedbackStats(): Promise<{
    total_feedback: number;
    thumbs_up_count: number;
    thumbs_down_count: number;
    average_accuracy_ratings: {
      item_extraction: number;
      price_extraction: number;
      tax_extraction: number;
    };
    confidence_breakdown: Record<string, number>;
  }> {
    try {
      // Get all feedback
      const { data: feedbackData, error } = await supabase
        .from('receipt_processing_history')
        .select('feedback')
        .not('feedback', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch feedback: ${error.message}`);
      }

      const totalFeedback = feedbackData?.length || 0;
      let thumbsUpCount = 0;
      let thumbsDownCount = 0;
      const itemAccuracyRatings: number[] = [];
      const priceAccuracyRatings: number[] = [];
      const taxAccuracyRatings: number[] = [];
      const confidenceBreakdown: Record<string, number> = {
        very_confident: 0,
        somewhat_confident: 0,
        not_confident: 0
      };

      feedbackData?.forEach(record => {
        const feedback = record.feedback as UserFeedback;
        
        // Count thumbs up/down
        if (feedback.overall_accuracy === 'thumbs_up') {
          thumbsUpCount++;
        } else if (feedback.overall_accuracy === 'thumbs_down') {
          thumbsDownCount++;
        }

        // Collect accuracy ratings
        if (feedback.item_extraction_accuracy) {
          itemAccuracyRatings.push(feedback.item_extraction_accuracy);
        }
        if (feedback.price_extraction_accuracy) {
          priceAccuracyRatings.push(feedback.price_extraction_accuracy);
        }
        if (feedback.tax_extraction_accuracy) {
          taxAccuracyRatings.push(feedback.tax_extraction_accuracy);
        }

        // Count confidence levels
        if (feedback.confidence_level) {
          confidenceBreakdown[feedback.confidence_level]++;
        }
      });

      // Calculate averages
      const calculateAverage = (ratings: number[]): number => {
        return ratings.length > 0 
          ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 100) / 100
          : 0;
      };

      return {
        total_feedback: totalFeedback,
        thumbs_up_count: thumbsUpCount,
        thumbs_down_count: thumbsDownCount,
        average_accuracy_ratings: {
          item_extraction: calculateAverage(itemAccuracyRatings),
          price_extraction: calculateAverage(priceAccuracyRatings),
          tax_extraction: calculateAverage(taxAccuracyRatings)
        },
        confidence_breakdown: confidenceBreakdown
      };
    } catch (error) {
      console.error('Error getting feedback stats:', error);
      return {
        total_feedback: 0,
        thumbs_up_count: 0,
        thumbs_down_count: 0,
        average_accuracy_ratings: {
          item_extraction: 0,
          price_extraction: 0,
          tax_extraction: 0
        },
        confidence_breakdown: {
          very_confident: 0,
          somewhat_confident: 0,
          not_confident: 0
        }
      };
    }
  }

  /**
   * Get feedback trends over time
   */
  static async getFeedbackTrends(days: number = 30): Promise<{
    date: string;
    thumbs_up: number;
    thumbs_down: number;
    total: number;
  }[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: feedbackData, error } = await supabase
        .from('receipt_processing_history')
        .select('feedback, created_at')
        .not('feedback', 'is', null)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch feedback trends: ${error.message}`);
      }

      // Group by date
      const trendsByDate: Record<string, { thumbs_up: number; thumbs_down: number; total: number }> = {};

      feedbackData?.forEach(record => {
        const feedback = record.feedback as UserFeedback;
        const date = new Date(record.created_at).toISOString().split('T')[0];

        if (!trendsByDate[date]) {
          trendsByDate[date] = { thumbs_up: 0, thumbs_down: 0, total: 0 };
        }

        trendsByDate[date].total++;
        if (feedback.overall_accuracy === 'thumbs_up') {
          trendsByDate[date].thumbs_up++;
        } else if (feedback.overall_accuracy === 'thumbs_down') {
          trendsByDate[date].thumbs_down++;
        }
      });

      // Convert to array and sort by date
      return Object.entries(trendsByDate)
        .map(([date, stats]) => ({
          date,
          ...stats
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error getting feedback trends:', error);
      return [];
    }
  }

  /**
   * Get feedback for a specific receipt
   */
  static async getFeedbackForReceipt(receiptId: string): Promise<UserFeedback | null> {
    try {
      const { data, error } = await supabase
        .from('receipt_processing_history')
        .select('feedback')
        .eq('id', receiptId)
        .single();

      if (error) {
        console.error('Error fetching feedback for receipt:', error);
        return null;
      }

      return data?.feedback ? {
        ...data.feedback,
        submitted_at: new Date(data.feedback.submitted_at)
      } : null;
    } catch (error) {
      console.error('Error getting feedback for receipt:', error);
      return null;
    }
  }

  /**
   * Get recent feedback with details
   */
  static async getRecentFeedback(limit: number = 10): Promise<Array<{
    receipt_id: string;
    feedback: UserFeedback;
    created_at: Date;
  }>> {
    try {
      const { data, error } = await supabase
        .from('receipt_processing_history')
        .select('id, feedback, created_at')
        .not('feedback', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch recent feedback: ${error.message}`);
      }

      return data?.map(record => ({
        receipt_id: record.id,
        feedback: {
          ...record.feedback,
          submitted_at: new Date(record.feedback.submitted_at)
        },
        created_at: new Date(record.created_at)
      })) || [];
    } catch (error) {
      console.error('Error getting recent feedback:', error);
      return [];
    }
  }

  /**
   * Calculate accuracy score from feedback
   */
  static calculateAccuracyScore(feedback: UserFeedback): number {
    let score = 0;
    let totalFactors = 0;

    // Overall accuracy (thumbs up = 1, thumbs down = 0)
    score += feedback.overall_accuracy === 'thumbs_up' ? 1 : 0;
    totalFactors++;

    // Item extraction accuracy (1-5 scale)
    if (feedback.item_extraction_accuracy) {
      score += feedback.item_extraction_accuracy / 5;
      totalFactors++;
    }

    // Price extraction accuracy (1-5 scale)
    if (feedback.price_extraction_accuracy) {
      score += feedback.price_extraction_accuracy / 5;
      totalFactors++;
    }

    // Tax extraction accuracy (1-5 scale)
    if (feedback.tax_extraction_accuracy) {
      score += feedback.tax_extraction_accuracy / 5;
      totalFactors++;
    }

    // Confidence level
    if (feedback.confidence_level) {
      const confidenceScores = {
        very_confident: 1,
        somewhat_confident: 0.5,
        not_confident: 0
      };
      score += confidenceScores[feedback.confidence_level];
      totalFactors++;
    }

    return totalFactors > 0 ? Math.round((score / totalFactors) * 100) / 100 : 0;
  }
} 