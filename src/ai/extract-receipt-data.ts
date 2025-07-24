'use server';

import { z } from 'zod';
import { 
  ExtractReceiptDataInputSchema, 
  AIOutputSchema,
  type ExtractReceiptDataInput, 
  type ExtractReceiptDataOutput,
  type AIOutput 
} from './types';
import { 
  ValidationError, 
  AIServiceError
} from './errors';
import { 
  validateImageDataUri, 
  extractAndParseJSON, 
  roundCurrency, 
  checkDiscrepancy, 
  validateExtractionResult,
  retryWithDelay 
} from './utils';
import { createGoogleAIClient, AI_CONFIG, EXTRACTION_PROMPT } from '@/lib/config';
import { validateImageSize } from '@/lib/utils';

export async function extractReceiptData(input: ExtractReceiptDataInput): Promise<ExtractReceiptDataOutput> {
  try {
    // Input validation
    ExtractReceiptDataInputSchema.parse(input);
    
    // Validate image size for Vercel limits
    validateImageSize(input.photoDataUri, AI_CONFIG.MAX_PAYLOAD_SIZE_KB);
    
  } catch (error) {
    throw new ValidationError(
      "Invalid input: " + (error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : String(error)),
      error as Error
    );
  }

  const genAI = createGoogleAIClient();
  const model = genAI.getGenerativeModel({
    model: AI_CONFIG.MODEL_NAME,
    safetySettings: AI_CONFIG.SAFETY_SETTINGS,
    generationConfig: AI_CONFIG.GENERATION_CONFIG
  });

  // Image validation and processing
  const { mimeType, base64Data } = validateImageDataUri(input.photoDataUri);
  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };

  // AI extraction with retry logic
  const aiOutput = await retryWithDelay(async (): Promise<AIOutput> => {
    try {
      const result = await model.generateContent([EXTRACTION_PROMPT, imagePart]);
      const response = result.response;
      
      // Check for blocked content
      if (response.promptFeedback?.blockReason) {
        throw new AIServiceError(`Content was blocked: ${response.promptFeedback.blockReason}`);
      }

      const aiResponseText = response.text();
      const parsedJson = extractAndParseJSON(aiResponseText);
      
      // Validate against schema
      return AIOutputSchema.parse(parsedJson);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        `AI extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        error as Error
      );
    }
  }, AI_CONFIG.MAX_RETRIES);

  // Validate extraction results
  validateExtractionResult(aiOutput);

  // Check for discrepancies
  const discrepancyCheck = checkDiscrepancy(aiOutput);

  // Format and return final result
  return {
    storeName: aiOutput.storeName.trim(),
    date: aiOutput.date,
    items: aiOutput.items.map(item => ({
      name: item.name.trim(),
      price: roundCurrency(item.price),
    })),
    totalCost: roundCurrency(aiOutput.totalCost),
    taxes: aiOutput.taxes && aiOutput.taxes > 0 ? roundCurrency(aiOutput.taxes) : undefined,
    otherCharges: aiOutput.otherCharges && aiOutput.otherCharges > 0 ? roundCurrency(aiOutput.otherCharges) : undefined,
    discount: aiOutput.discount && aiOutput.discount > 0 ? roundCurrency(aiOutput.discount) : undefined,
    discrepancyFlag: discrepancyCheck.flag,
    discrepancyMessage: discrepancyCheck.message,
  };
}

export type { ExtractReceiptDataInput, ExtractReceiptDataOutput };