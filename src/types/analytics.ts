import { ExtractReceiptDataOutput } from './index';

// Re-export for convenience
export type { ExtractReceiptDataOutput };

export interface UserAnalytics {
  id: string;
  user_id: string; // Splitwise numeric ID as string
  
  // Basic tracking
  first_signin: Date;
  last_signin: Date;
  total_sessions: number;
  total_receipts_processed: number;
  total_corrections_made: number;
  average_accuracy_rating: number | null;
  
  // User profile data (from Splitwise)
  user_profile?: {
    first_name: string;
    last_name: string;
    email: string;
    registration_status: string;
    profile_picture_url?: string;
    account_created_at?: Date;
  };
  

  
  // Performance metrics
  performance_metrics?: {
    average_processing_time_ms: number;
    total_processing_time_ms: number;
    fastest_processing_time_ms: number;
    slowest_processing_time_ms: number;
  };
  
  // Feedback metrics
  feedback_metrics?: {
    total_feedback_submitted: number;
    thumbs_up_count: number;
    thumbs_down_count: number;
    average_item_accuracy_rating: number;
    average_price_accuracy_rating: number;
    average_tax_accuracy_rating: number;
  };
  
  // Correction patterns
  correction_patterns?: {
    most_corrected_field: 'item_name' | 'item_price' | 'tax' | 'other_charges' | 'total_cost';
    average_corrections_per_receipt: number;
    total_item_name_corrections: number;
    total_item_price_corrections: number;
    total_tax_corrections: number;
    total_other_charges_corrections: number;
  };
  
  created_at: Date;
  updated_at: Date;
}

export interface ReceiptProcessingHistory {
  id: string;
  user_id: string; // Splitwise numeric ID as string
  image_url: string;
  image_hash: string;
  original_filename: string;
  file_size: number;
  ai_extraction: ExtractReceiptDataOutput;
  user_corrections?: CorrectionData;
  feedback?: UserFeedback;
  processing_time_ms: number;
  ai_model_version: string;
  created_at: Date;
  updated_at: Date;
}

export interface CorrectionData {
  original_ai_extraction: ExtractReceiptDataOutput;
  user_corrections: {
    items: Array<{
      original: { name: string; price: number };
      corrected: { name: string; price: number };
      correction_type: 'name' | 'price' | 'both';
    }>;
    taxes?: { original: number; corrected: number };
    other_charges?: { original: number; corrected: number };
    total_cost?: { original: number; corrected: number };
  };
  correction_count: number;
  correction_percentage: number;
}

export interface UserFeedback {
  overall_accuracy: 'thumbs_up' | 'thumbs_down';
  item_extraction_accuracy?: number; // 1-5 scale
  price_extraction_accuracy?: number; // 1-5 scale
  tax_extraction_accuracy?: number; // 1-5 scale
  confidence_level?: 'very_confident' | 'somewhat_confident' | 'not_confident';
  additional_notes?: string;
  submitted_at: Date;
}

export interface CorrectionPattern {
  id: string;
  receipt_id: string;
  correction_type: string;
  original_value: string;
  corrected_value: string;
  confidence_score: number | null;
  created_at: Date;
}

// Analytics tracking events
export type TrackingEvent = 
  | 'user_signin'
  | 'receipt_uploaded'
  | 'ai_extraction_completed'
  | 'corrections_made'
  | 'feedback_submitted'
  | 'expense_created';

export interface TrackingEventData {
  event: TrackingEvent;
  user_id: string;
  timestamp: Date;
  metadata?: Record<string, any>;
} 