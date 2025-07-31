"use server";

import {
  AI_CONFIG,
  EXTRACTION_PROMPT,
} from "@/lib/config";
import { logger } from "@/lib/logger";
import { validateImageSize } from "@/lib/utils";
import { z } from "zod";
import { AIServiceFactory } from "./ai-service-factory";
import { AIServiceError, ValidationError } from "./errors";
import {
  AIOutputSchema,
  ExtractReceiptDataInputSchema,
  type AIOutput,
  type ExtractReceiptDataInput,
  type ExtractReceiptDataOutput,
} from "./types";
import {
  checkDiscrepancy,
  extractAndParseJSON,
  retryWithDelay,
  roundCurrency,
  validateExtractionResult
} from "./utils";

export async function extractReceiptData(
  input: ExtractReceiptDataInput,
  userId?: string,
  receiptId?: string
): Promise<ExtractReceiptDataOutput & { 
  aiMetadata?: {
    provider: string;
    modelName: string;
    tokensUsed?: number;
    processingTimeMs?: number;
  }
}> {
  const startTime = Date.now();
  const logContext = { userId, receiptId, operation: 'extract_receipt_data' };

  try {
    logger.info("Starting receipt data extraction", logContext);

    // Input validation
    ExtractReceiptDataInputSchema.parse(input);

    // Validate image size for Vercel limits
    validateImageSize(input.photoDataUri, AI_CONFIG.MAX_PAYLOAD_SIZE_KB);
    
    logger.debug("Input validation passed", logContext);

  } catch (error) {
    logger.error("Input validation failed", logContext, error as Error);
    throw new ValidationError(
      "Invalid input: " +
        (error instanceof z.ZodError
          ? error.errors.map((e) => e.message).join(", ")
          : String(error)),
      error as Error
    );
  }

  // Create AI provider based on configuration
  const providerConfig = AI_CONFIG.PROVIDER === "google-gemini" 
    ? {
        modelName: AI_CONFIG.GOOGLE_GEMINI.MODEL_NAME,
        apiKey: AI_CONFIG.GOOGLE_GEMINI.API_KEY,
        temperature: AI_CONFIG.GOOGLE_GEMINI.TEMPERATURE,
        maxTokens: AI_CONFIG.GOOGLE_GEMINI.MAX_TOKENS,
      }
    : {
        modelName: AI_CONFIG.OPENROUTER.MODEL_NAME,
        apiKey: AI_CONFIG.OPENROUTER.API_KEY,
        baseUrl: AI_CONFIG.OPENROUTER.BASE_URL,
        temperature: AI_CONFIG.OPENROUTER.TEMPERATURE,
        maxTokens: AI_CONFIG.OPENROUTER.MAX_TOKENS,
      };
    
  const aiProvider = AIServiceFactory.createProvider(AI_CONFIG.PROVIDER, providerConfig);

  logger.aiRequest(
    aiProvider.name,
    providerConfig.modelName,
    'extract_receipt_data',
    logContext,
    { providerType: AI_CONFIG.PROVIDER }
  );

  let aiResponse: any = null;

  // AI extraction with retry logic
  const aiOutput = await retryWithDelay(async (): Promise<AIOutput> => {
    try {
      const response = await aiProvider.generateContent({
        prompt: EXTRACTION_PROMPT,
        imageDataUri: input.photoDataUri,
      });

      aiResponse = response;

      if (response.blocked) {
        logger.warn("AI content was blocked", {
          ...logContext,
          provider: aiProvider.name,
          model: providerConfig.modelName,
          blockReason: response.blockReason,
        });
        throw new AIServiceError(`Content was blocked: ${response.blockReason}`);
      }

      logger.aiResponse(
        aiProvider.name,
        providerConfig.modelName,
        'extract_receipt_data',
        response.processingTimeMs || 0,
        response.tokensUsed,
        logContext,
        { 
          modelUsed: response.modelUsed,
          providerName: response.providerName,
        }
      );

      const parsedJson = extractAndParseJSON(response.text);
      return AIOutputSchema.parse(parsedJson);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AIServiceError) {
        throw error;
      }
      
      logger.aiError(
        aiProvider.name,
        providerConfig.modelName,
        'extract_receipt_data',
        error as Error,
        logContext
      );
      
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

  if (discrepancyCheck.flag) {
    logger.warn("Discrepancy detected in extracted data", {
      ...logContext,
      discrepancyMessage: discrepancyCheck.message,
    });
  }

  // Format and return final result
  const result = {
    storeName: aiOutput.storeName.trim(),
    date: aiOutput.date,
    items: aiOutput.items.map((item) => ({
      name: item.name.trim(),
      price: roundCurrency(item.price),
    })),
    totalCost: roundCurrency(aiOutput.totalCost),
    taxes:
      aiOutput.taxes && aiOutput.taxes > 0
        ? roundCurrency(aiOutput.taxes)
        : undefined,
    otherCharges:
      aiOutput.otherCharges && aiOutput.otherCharges > 0
        ? roundCurrency(aiOutput.otherCharges)
        : undefined,
    discount:
      aiOutput.discount && aiOutput.discount > 0
        ? roundCurrency(aiOutput.discount)
        : undefined,
    discrepancyFlag: discrepancyCheck.flag,
    discrepancyMessage: discrepancyCheck.message,
    aiMetadata: aiResponse ? {
      provider: aiResponse.providerName || aiProvider.name,
      modelName: aiResponse.modelUsed || providerConfig.modelName,
      tokensUsed: aiResponse.tokensUsed,
      processingTimeMs: aiResponse.processingTimeMs,
    } : undefined,
  };

  const totalProcessingTime = Date.now() - startTime;
  logger.info("Receipt data extraction completed successfully", {
    ...logContext,
    totalProcessingTimeMs: totalProcessingTime,
    itemsExtracted: result.items.length,
    hasDiscrepancy: result.discrepancyFlag,
  });

  return result;
}
