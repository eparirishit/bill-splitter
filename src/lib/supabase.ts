import { createClient } from '@supabase/supabase-js';
import type { ExtractReceiptDataOutput } from '@/types';
import type { CorrectionData, UserFeedback } from '@/types/analytics';

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
          ai_extraction: ExtractReceiptDataOutput;
          user_corrections: CorrectionData | null;
          feedback: UserFeedback | null;
          processing_time_ms: number | null;
          ai_model_version: string;
          ai_provider: string | null;
          ai_model_name: string | null;
          ai_tokens_used: number | null;
          ai_processing_time_ms: number | null;
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
          ai_extraction: ExtractReceiptDataOutput;
          user_corrections?: CorrectionData | null;
          feedback?: UserFeedback | null;
          processing_time_ms?: number | null;
          ai_model_version?: string;
          ai_provider?: string | null;
          ai_model_name?: string | null;
          ai_tokens_used?: number | null;
          ai_processing_time_ms?: number | null;
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
          ai_extraction?: ExtractReceiptDataOutput;
          user_corrections?: CorrectionData | null;
          feedback?: UserFeedback | null;
          processing_time_ms?: number | null;
          ai_model_version?: string;
          ai_provider?: string | null;
          ai_model_name?: string | null;
          ai_tokens_used?: number | null;
          ai_processing_time_ms?: number | null;
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

/**
 * Downloads an image from Supabase storage URL and converts it to a data URI
 * Used server-side for AI processing when images are stored in Supabase storage
 * @param imageUrl - The Supabase storage public URL
 * @returns Data URI string (data:image/jpeg;base64,...)
 */
export async function downloadImageAsDataUri(imageUrl: string): Promise<string> {
  try {
    // Check if this is a Supabase storage URL
    // URL format: https://<project>.supabase.co/storage/v1/object/public/receipt-images/<userId>/<hash>.<ext>
    const isSupabaseUrl = imageUrl.includes('supabase.co') && imageUrl.includes('/storage/');
    
    if (isSupabaseUrl) {
      // Extract the file path from the Supabase storage URL
      // Handle both /public/ and non-public URLs
      let urlMatch = imageUrl.match(/\/storage\/v1\/object\/public\/receipt-images\/(.+)$/);
      let filePath: string | null = null;
      let publicUrl = imageUrl;
      
      if (urlMatch) {
        filePath = urlMatch[1];
      } else {
        // Try to extract from non-public URL and construct public URL
        const nonPublicMatch = imageUrl.match(/\/storage\/v1\/object\/receipt-images\/(.+)$/);
        if (nonPublicMatch) {
          filePath = nonPublicMatch[1];
          // Construct the public URL
          const baseUrl = imageUrl.split('/storage/')[0];
          publicUrl = `${baseUrl}/storage/v1/object/public/receipt-images/${filePath}`;
        }
      }
      
      if (filePath) {
        // Use Supabase storage API for server-side access
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error('Missing Supabase environment variables for server-side access');
        }

        // Create a server-side Supabase client
        const { createClient } = await import('@supabase/supabase-js');
        const serverSupabase = createClient(supabaseUrl, supabaseServiceKey);

        // Try to download the file from Supabase storage
        const { data, error } = await serverSupabase.storage
          .from('receipt-images')
          .download(filePath);

        if (error) {
          // Parse error message - it might be a JSON string
          let errorMessage = error.message;
          try {
            const parsedError = JSON.parse(error.message);
            if (parsedError.message) {
              errorMessage = parsedError.message;
            } else if (parsedError.error) {
              errorMessage = parsedError.error;
            }
          } catch {
            // Not JSON, use as-is
          }
          
          // If download fails, try generating a signed URL (for private buckets)
          const errorStatus = (error as any).statusCode || (error as any).status || 'unknown';
          console.warn(`Supabase storage API download failed for ${filePath}, trying signed URL:`, {
            error: errorMessage,
            statusCode: errorStatus,
            filePath
          });
          
          try {
            // Generate a signed URL with 2 hour expiry for private bucket access
            const { data: signedUrlData, error: signedUrlError } = await serverSupabase.storage
              .from('receipt-images')
              .createSignedUrl(filePath, 2 * 60 * 60); // 2 hours in seconds
            
            if (signedUrlError || !signedUrlData?.signedUrl) {
              throw new Error(
                `Failed to generate signed URL: ${signedUrlError?.message || 'Unknown error'}. ` +
                `Original error: ${errorMessage} (${errorStatus})`
              );
            }
            
            const signedUrl = signedUrlData.signedUrl;
            console.log(`Generated signed URL for ${filePath}, fetching image...`);
            
            // Fetch the image using the signed URL
            const response = await fetch(signedUrl, {
              method: 'GET',
              headers: {
                'Accept': 'image/jpeg,image/jpg,image/png',
              },
            });
            
            if (!response.ok) {
              const errorBody = await response.text().catch(() => '');
              throw new Error(
                `Storage API failed: ${errorMessage} (${errorStatus}). ` +
                `Signed URL fetch also failed: ${response.status} ${response.statusText}. ` +
                `File path: ${filePath}. ` +
                `Error details: ${errorBody.substring(0, 200)}`
              );
            }
            
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const mimeType = blob.type || (filePath.endsWith('.png') ? 'image/png' : 'image/jpeg');
            
            return `data:${mimeType};base64,${base64}`;
          } catch (fetchError) {
            throw new Error(
              `Failed to download image: Storage API error: ${errorMessage} (${errorStatus}). ` +
              `Signed URL generation/fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
            );
          }
        }

        if (!data) {
          throw new Error('No data received from storage');
        }

        // Convert blob to base64
        const arrayBuffer = await data.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        // Determine MIME type from file extension
        const extension = filePath.split('.').pop()?.toLowerCase();
        let mimeType = 'image/jpeg';
        if (extension === 'png') {
          mimeType = 'image/png';
        } else if (extension === 'jpg' || extension === 'jpeg') {
          mimeType = 'image/jpeg';
        }
        
        return `data:${mimeType};base64,${base64}`;
      }
    }

    // Fallback to direct fetch for non-Supabase URLs or if path extraction failed
    const response = await fetch(imageUrl, {
      headers: {
        'Accept': 'image/jpeg,image/jpg,image/png',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to fetch image: ${response.statusText} (${response.status}). ${errorText.substring(0, 200)}`);
    }
    
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = blob.type || 'image/jpeg';
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    throw new Error(
      `Failed to download and convert image from URL: ${error instanceof Error ? error.message : String(error)}`
    );
  }
} 