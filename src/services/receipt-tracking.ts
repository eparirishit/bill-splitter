import { getSupabaseClient, uploadImageToStorage, generateImageHash } from '@/lib/supabase';
import { SUPABASE_STORAGE_CONFIG } from '@/lib/config';
import { CorrectionData, ExtractReceiptDataOutput, ReceiptProcessingHistory } from '@/types/analytics';

export interface TrackReceiptOptions {
  userId: string;
  file: File | null;
  aiExtraction: ExtractReceiptDataOutput;
  processingTimeMs: number;
  aiModelVersion?: string;
  aiProvider?: string;
  aiModelName?: string;
  aiTokensUsed?: number;
  aiProcessingTimeMs?: number;
  existingImageUrl?: string;
  existingImageHash?: string;
  originalFilename?: string;
  fileSize?: number;
}

export class ReceiptTrackingService {
  /**
   * Track receipt processing and store image
   */
  static async trackReceiptProcessing(options: TrackReceiptOptions): Promise<string> {
    const {
      userId, file, aiExtraction, processingTimeMs,
      aiModelVersion = 'v1.0', aiProvider, aiModelName,
      aiTokensUsed, aiProcessingTimeMs,
      existingImageUrl, existingImageHash,
      originalFilename, fileSize
    } = options;
    try {
      // Upload image to Supabase Storage (or reuse existing URL if provided)
      let imageUrl: string;
      let imageHash: string;
      let filename: string;
      let size: number;

      if (existingImageUrl) {
        // Reuse existing URL
        imageUrl = existingImageUrl;
        if (existingImageHash) {
          imageHash = existingImageHash;
        } else if (file) {
          // Generate hash from file if provided
          imageHash = await generateImageHash(file);
        } else {
          // Extract hash from URL path if possible, otherwise generate a placeholder
          const urlParts = existingImageUrl.split('/');
          const fileName = urlParts[urlParts.length - 1]?.split('?')[0] || '';
          imageHash = fileName.split('.')[0] || 'unknown';
        }
        filename = originalFilename || 'uploaded-image';
        size = fileSize || 0;
      } else if (file) {
        // Upload new image
        const uploadResult = await uploadImageToStorage(file, userId);
        imageUrl = uploadResult.url;
        imageHash = uploadResult.hash;
        filename = file.name;
        size = file.size;
      } else {
        throw new Error('Either file or existingImageUrl must be provided');
      }

      // Store processing record
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('receipt_processing_history')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          image_hash: imageHash,
          original_filename: filename,
          file_size: size,
          ai_extraction: aiExtraction,
          processing_time_ms: processingTimeMs,
          ai_model_version: aiModelVersion,
          ai_provider: aiProvider,
          ai_model_name: aiModelName,
          ai_tokens_used: aiTokensUsed,
          ai_processing_time_ms: aiProcessingTimeMs
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to store receipt processing record: ${error.message}`);
      }

      return data.id;
    } catch (error) {
      console.error('Error tracking receipt processing:', error);
      throw error;
    }
  }

  /**
   * Update receipt processing record with user corrections
   */
  static async updateWithCorrections(
    receiptId: string,
    corrections: CorrectionData
  ): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('receipt_processing_history')
        .update({
          user_corrections: corrections,
          updated_at: new Date().toISOString()
        })
        .eq('id', receiptId);

      if (error) {
        throw new Error(`Failed to update corrections: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating corrections:', error);
      throw error;
    }
  }

  /**
   * Update receipt processing record with user feedback
   */
  static async updateWithFeedback(
    receiptId: string,
    feedback: Record<string, unknown>
  ): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('receipt_processing_history')
        .update({
          feedback: feedback,
          updated_at: new Date().toISOString()
        })
        .eq('id', receiptId);

      if (error) {
        throw new Error(`Failed to update feedback: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating feedback:', error);
      throw error;
    }
  }

  /**
   * Get receipt processing history for a user
   */
  static async getUserReceiptHistory(userId: string): Promise<ReceiptProcessingHistory[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('receipt_processing_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching receipt history:', error);
        return [];
      }

      return data?.map(record => ({
        ...record,
        created_at: new Date(record.created_at),
        updated_at: new Date(record.updated_at)
      })) || [];
    } catch (error) {
      console.error('Error getting user receipt history:', error);
      return [];
    }
  }

  /**
   * Get receipt processing record by ID
   */
  static async getReceiptById(receiptId: string): Promise<ReceiptProcessingHistory | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('receipt_processing_history')
        .select('*')
        .eq('id', receiptId)
        .single();

      if (error) {
        console.error('Error fetching receipt:', error);
        return null;
      }

      return data ? {
        ...data,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at)
      } : null;
    } catch (error) {
      console.error('Error getting receipt by ID:', error);
      return null;
    }
  }

  /**
   * Get processing statistics
   */
  static async getProcessingStats(): Promise<{
    total_receipts: number;
    average_processing_time: number;
    total_feedback_received: number;
    accuracy_breakdown: {
      thumbs_up: number;
      thumbs_down: number;
    };
  }> {
    try {
      const supabase = getSupabaseClient();
      // Get total receipts
      const { count: totalReceipts } = await supabase
        .from('receipt_processing_history')
        .select('*', { count: 'exact', head: true });

      // Get average processing time
      const { data: processingData } = await supabase
        .from('receipt_processing_history')
        .select('processing_time_ms')
        .not('processing_time_ms', 'is', null);

      const averageProcessingTime = processingData && processingData.length > 0
        ? processingData.reduce((sum, record) => sum + (record.processing_time_ms || 0), 0) / processingData.length
        : 0;

      // Get feedback statistics
      const { data: feedbackData } = await supabase
        .from('receipt_processing_history')
        .select('feedback')
        .not('feedback', 'is', null);

      const accuracyBreakdown = {
        thumbs_up: 0,
        thumbs_down: 0
      };

      feedbackData?.forEach(record => {
        if (record.feedback?.overall_accuracy === 'thumbs_up') {
          accuracyBreakdown.thumbs_up++;
        } else if (record.feedback?.overall_accuracy === 'thumbs_down') {
          accuracyBreakdown.thumbs_down++;
        }
      });

      return {
        total_receipts: totalReceipts || 0,
        average_processing_time: Math.round(averageProcessingTime),
        total_feedback_received: feedbackData?.length || 0,
        accuracy_breakdown: accuracyBreakdown
      };
    } catch (error) {
      console.error('Error getting processing stats:', error);
      return {
        total_receipts: 0,
        average_processing_time: 0,
        total_feedback_received: 0,
        accuracy_breakdown: {
          thumbs_up: 0,
          thumbs_down: 0
        }
      };
    }
  }

  /**
   * Delete receipt processing record (for GDPR compliance)
   */
  static async deleteReceiptRecord(receiptId: string): Promise<void> {
    try {
      // First get the record to delete the image
      const record = await this.getReceiptById(receiptId);
      if (record) {
        // Extract filename from URL for deletion
        const urlParts = record.image_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const userId = record.user_id;
        const fullPath = `${userId}/${fileName}`;

        // Delete from storage (use server client for storage operations too)
        const supabase = getSupabaseClient();
        const { error: storageError } = await supabase.storage
          .from(SUPABASE_STORAGE_CONFIG.BUCKET_NAME)
          .remove([fullPath]);

        if (storageError) {
          console.error('Error deleting image from storage:', storageError);
        }
      }

      // Delete from database
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('receipt_processing_history')
        .delete()
        .eq('id', receiptId);

      if (error) {
        throw new Error(`Failed to delete receipt record: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting receipt record:', error);
      throw error;
    }
  }
} 