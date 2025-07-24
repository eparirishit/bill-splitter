import { AI_CONFIG } from '@/lib/config';
import { ImageProcessingError, ValidationError } from './errors';
import type { AIOutput, DiscrepancyCheck } from './types';

export function validateImageDataUri(photoDataUri: string): { mimeType: string; base64Data: string } {
  const match = photoDataUri.match(/^data:(image\/(?:jpeg|jpg|png|webp|heic|heif));base64,(.+)$/i);
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

  let jsonString: string | null = null;
  
  // Try to extract JSON from code blocks first
  const codeBlockMatch = aiResponseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonString = codeBlockMatch[1].trim();
  } else {
    // Try to find JSON object directly
    const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    } else {
      throw new ValidationError("No JSON structure found in AI response");
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
