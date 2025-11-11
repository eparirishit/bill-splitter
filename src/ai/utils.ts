import { AI_CONFIG } from '@/lib/config';
import { ImageProcessingError, ValidationError } from './errors';
import type { AIOutput, DiscrepancyCheck } from './types';

/**
 * Fetches an image from a Supabase storage URL and converts it to a data URI
 * Used when images are stored in Supabase storage
 * This function works server-side and uses Supabase's storage API for proper authentication
 */
export async function fetchImageAsDataUri(imageUrl: string): Promise<string> {
  try {
    // Check if this is a Supabase storage URL
    // URL format: https://<project>.supabase.co/storage/v1/object/public/receipt-images/<userId>/<hash>.<ext>
    const isSupabaseUrl = imageUrl.includes('supabase.co') && imageUrl.includes('/storage/');
    
    if (isSupabaseUrl) {
      // Extract the file path from the Supabase storage URL
      const urlMatch = imageUrl.match(/\/storage\/v1\/object\/public\/receipt-images\/(.+)$/);
      
      if (urlMatch) {
        const filePath = urlMatch[1];
        
        // Use Supabase storage API for server-side access
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error('Missing Supabase environment variables for server-side access');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Download the file from Supabase storage
        const { data, error } = await supabase.storage
          .from('receipt-images')
          .download(filePath);

        if (error) {
          // If download fails with storage API, try fetching from public URL
          // This handles cases where the bucket is public but API access has issues
          const errorStatus = (error as any).statusCode || (error as any).status || 'unknown';
          console.warn(`Supabase storage API download failed for ${filePath}, trying public URL fetch:`, {
            error: error.message,
            statusCode: errorStatus,
            filePath
          });
          
          try {
            // Try fetching from public URL
            const response = await fetch(imageUrl, {
              method: 'GET',
              headers: {
                'Accept': 'image/jpeg,image/jpg,image/png',
              },
            });
            
            if (!response.ok) {
              // If public URL also fails, throw detailed error
              const errorBody = await response.text().catch(() => '');
              throw new Error(
                `Storage API failed: ${error.message} (${errorStatus}). ` +
                `Public URL fetch also failed: ${response.status} ${response.statusText}. ` +
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
              `Failed to download image: Storage API error: ${error.message} (${errorStatus}). ` +
              `Public URL fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
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
    throw new ImageProcessingError(
      `Failed to fetch and convert image from URL: ${error instanceof Error ? error.message : String(error)}`,
      error as Error
    );
  }
}

export function validateImageDataUri(photoDataUri: string): { mimeType: string; base64Data: string } {
  const match = photoDataUri.match(/^data:(image\/(?:jpeg|jpg|png));base64,(.+)$/i);
  if (!match) {
    throw new ImageProcessingError('Invalid photoDataUri format. Expected data URI with supported image format and Base64 encoding.');
  }

  const [, mimeType, base64Data] = match;

  // Validate base64 data
  try {
    atob(base64Data);
  } catch (error) {
    throw new ImageProcessingError('Invalid Base64 data in photoDataUri.', error as Error);
  }

  return { mimeType, base64Data };
}

export function extractAndParseJSON(aiResponseText: string): unknown {
  if (!aiResponseText || aiResponseText.trim().length === 0) {
    throw new ValidationError("AI returned empty response");
  }

  const trimmed = aiResponseText.trim();
  let jsonString: string | null = null;
  
  // If response starts with {, it's likely pure JSON (e.g., when responseMimeType is set)
  if (trimmed.startsWith('{')) {
    jsonString = trimmed;
  } else {
    // Try to extract JSON from code blocks
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    } else {
      // Try to find JSON object directly
      const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      } else {
        throw new ValidationError("No JSON structure found in AI response");
      }
    }
  }

  try {
    // Remove any trailing commas and fix common JSON issues
    const cleanedJson = jsonString
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/\n/g, ' ')          // Remove newlines
      .trim();
    
    return JSON.parse(cleanedJson);
  } catch (parseError) {
    throw new ValidationError(`JSON parsing failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
  }
}

export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function checkDiscrepancy(aiOutput: AIOutput): DiscrepancyCheck {
  const { items, totalCost: totalCostFromReceipt } = aiOutput;
  const taxes = aiOutput.taxes ?? 0;
  const otherCharges = aiOutput.otherCharges ?? 0;
  const discount = aiOutput.discount ?? 0;

  const itemsSum = items.reduce((sum, item) => sum + item.price, 0);
  const calculatedTotal = roundCurrency(itemsSum + taxes + otherCharges - discount);
  const receiptTotal = roundCurrency(totalCostFromReceipt);

  const tolerance = 0.02;
  const difference = Math.abs(calculatedTotal - receiptTotal);

  if (difference > tolerance) {
    const message = `Receipt total ($${receiptTotal.toFixed(2)}) differs from calculated total ($${calculatedTotal.toFixed(2)}) by $${difference.toFixed(2)}. This may indicate missing items, fees, or rounding differences.`;
    console.warn("Discrepancy detected:", message);
    return { flag: true, message };
  }

  return { flag: false };
}

export function validateExtractionResult(aiOutput: AIOutput): void {
  if (aiOutput.items.length === 0) {
    throw new ValidationError("No items were extracted from the receipt");
  }

  if (aiOutput.totalCost <= 0) {
    throw new ValidationError("Invalid total cost extracted from receipt");
  }
}

export async function retryWithDelay<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  baseDelay: number = AI_CONFIG.RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Attempt ${attempt} failed:`, lastError.message);
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * attempt + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
