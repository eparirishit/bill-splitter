import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database table types for better TypeScript support
export interface Database {
  public: {
    Tables: {
      user_analytics: {
        Row: {
          id: string;
          user_id: string;
          first_signin: string;
          last_signin: string;
          total_sessions: number;
          total_receipts_processed: number;
          total_corrections_made: number;
          average_accuracy_rating: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          first_signin?: string;
          last_signin?: string;
          total_sessions?: number;
          total_receipts_processed?: number;
          total_corrections_made?: number;
          average_accuracy_rating?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          first_signin?: string;
          last_signin?: string;
          total_sessions?: number;
          total_receipts_processed?: number;
          total_corrections_made?: number;
          average_accuracy_rating?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      receipt_processing_history: {
        Row: {
          id: string;
          user_id: string;
          image_url: string;
          image_hash: string;
          original_filename: string | null;
          file_size: number | null;
          ai_extraction: any;
          user_corrections: any | null;
          feedback: any | null;
          processing_time_ms: number | null;
          ai_model_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          image_url: string;
          image_hash: string;
          original_filename?: string | null;
          file_size?: number | null;
          ai_extraction: any;
          user_corrections?: any | null;
          feedback?: any | null;
          processing_time_ms?: number | null;
          ai_model_version?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          image_url?: string;
          image_hash?: string;
          original_filename?: string | null;
          file_size?: number | null;
          ai_extraction?: any;
          user_corrections?: any | null;
          feedback?: any | null;
          processing_time_ms?: number | null;
          ai_model_version?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      correction_patterns: {
        Row: {
          id: string;
          receipt_id: string;
          correction_type: string;
          original_value: string | null;
          corrected_value: string | null;
          confidence_score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          receipt_id: string;
          correction_type: string;
          original_value?: string | null;
          corrected_value?: string | null;
          confidence_score?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          receipt_id?: string;
          correction_type?: string;
          original_value?: string | null;
          corrected_value?: string | null;
          confidence_score?: number | null;
          created_at?: string;
        };
      };
    };
  };
}

// Helper function to generate image hash for deduplication
export const generateImageHash = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};



// Helper function to upload image to Supabase Storage
export const uploadImageToStorage = async (
  file: File,
  userId: string
): Promise<{ url: string; hash: string }> => {
  try {
    const hash = await generateImageHash(file);
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${hash}.${fileExt}`;

    console.log('Uploading image:', { fileName, userId, fileSize: file.size });

    // First, check if the file already exists
    const { data: existingFile } = await supabase.storage
      .from('receipt-images')
      .list(userId, {
        search: hash
      });

    // If file already exists, return the existing URL
    if (existingFile && existingFile.length > 0) {
      console.log('Image already exists, using existing file');
      const { data: urlData } = supabase.storage
        .from('receipt-images')
        .getPublicUrl(fileName);
      
      return {
        url: urlData.publicUrl,
        hash
      };
    }

    // Upload new file
    const { data, error } = await supabase.storage
      .from('receipt-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error('Storage upload error:', error);
      
      // If it's a duplicate error, try to get the existing URL
      if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
        console.log('Handling duplicate file error');
        const { data: urlData } = supabase.storage
          .from('receipt-images')
          .getPublicUrl(fileName);
        
        return {
          url: urlData.publicUrl,
          hash
        };
      }
      
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    console.log('Image uploaded successfully:', data);

    const { data: urlData } = supabase.storage
      .from('receipt-images')
      .getPublicUrl(fileName);

    return {
      url: urlData.publicUrl,
      hash
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}; 