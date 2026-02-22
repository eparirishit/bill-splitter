"use server";

import {
  AI_CONFIG,
  EXTRACTION_PROMPT,
} from "@/lib/config";
import { AI_SERVER_CONFIG } from "@/lib/config.server";
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
  fetchImageAsDataUri,
  getAIProviderConfig,
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
  let photoDataUri: string | undefined;

  try {
    logger.info("Starting receipt data extraction", logContext);

    // Input validation
    ExtractReceiptDataInputSchema.parse(input);

    // If imageUrl is provided, fetch and convert to data URI
    photoDataUri = input.photoDataUri;
    if (input.imageUrl && !photoDataUri) {
      logger.debug("Fetching image from storage URL", { ...logContext, imageUrl: input.imageUrl });
      photoDataUri = await fetchImageAsDataUri(input.imageUrl);
      logger.debug("Image fetched and converted to data URI", logContext);
    }

    if (!photoDataUri) {
      throw new ValidationError("Either photoDataUri or imageUrl must be provided");
    }

    // Validate image size for Vercel limits (only if using data URI directly)
    // Skip validation if using storage URL as it's already stored
    if (input.photoDataUri) {
      validateImageSize(photoDataUri, AI_CONFIG.MAX_PAYLOAD_SIZE_KB);
    }

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
  const providerConfig = getAIProviderConfig();

  const aiProvider = AIServiceFactory.createProvider(AI_SERVER_CONFIG.PROVIDER, providerConfig);

  logger.aiRequest(
    aiProvider.name,
    providerConfig.modelName,
    'extract_receipt_data',
    logContext,
    { providerType: AI_SERVER_CONFIG.PROVIDER }
  );

  let aiResponse: any = null;

  // AI extraction with retry logic
  const aiOutput = await retryWithDelay(async (): Promise<AIOutput> => {
    try {
      const response = await aiProvider.generateContent({
        prompt: EXTRACTION_PROMPT,
        imageDataUri: photoDataUri!,
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
  const rawStoreName = (aiOutput.storeName ?? "").trim();
  const inferredStoreName = rawStoreName.length === 0;
  const result = {
    storeName: inferredStoreName ? AI_CONFIG.DEFAULT_STORE_NAME : rawStoreName,
    date: aiOutput.date,
    items: aiOutput.items.map((item) => ({
      name: item.name.trim(),
      price: roundCurrency(item.price),
      quantity: item.quantity || 1,
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
    storeNameInferred: inferredStoreName || undefined,
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
