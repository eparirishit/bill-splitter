

import { AI_SERVER_CONFIG } from "@/lib/config.server";
import { logger } from "@/lib/logger";
import { AIServiceFactory } from "./ai-service-factory";
import { AIServiceError } from "./errors";
import { FeedbackClassificationSchema, type FeedbackClassification } from "./types";
import { extractAndParseJSON, getAIProviderConfig, retryWithDelay } from "./utils";

const CLASSIFICATION_PROMPT = `
You are a helpful AI assistant that classifies user feedback for SplitScan, an AI-powered bill splitting app.
Analyze the following user feedback message and classify it into one of these categories:
- 'bug': Reports of errors, crashes, or incorrect behavior.
- 'feature': Requests for new functionality or improvements.
- 'general': General comments, praise, or non-actionable feedback.
- 'support': Requests for help or questions about how to use the app.

Also provide a confidence score (0-1) and a brief summary.

Return the result as a JSON object with the following structure:
{
  "type": "bug" | "feature" | "general" | "support",
  "confidence": number,
  "summary": string
}

User Feedback:
`;

export async function classifyFeedback(
    message: string,
    userId?: string
): Promise<FeedbackClassification> {
    const logContext = { userId, operation: 'classify_feedback' };

    try {
        // strict validation not strictly needed for string but good practice
        if (!message || !message.trim()) {
            return { type: 'general', confidence: 0, summary: 'Empty message' };
        }

        const providerConfig = getAIProviderConfig({
            temperature: 0.1,
            maxTokens: 1024
        });

        const aiProvider = AIServiceFactory.createProvider(AI_SERVER_CONFIG.PROVIDER, providerConfig);

        logger.aiRequest(
            aiProvider.name,
            providerConfig.modelName,
            'classify_feedback',
            logContext,
            { providerType: AI_SERVER_CONFIG.PROVIDER }
        );

        const classification = await retryWithDelay(async (): Promise<FeedbackClassification> => {
            const response = await aiProvider.generateContent({
                prompt: `${CLASSIFICATION_PROMPT}"${message}"`,
            });

            if (response.blocked) {
                throw new AIServiceError(`Content was blocked: ${response.blockReason}`);
            }

            logger.aiResponse(
                aiProvider.name,
                providerConfig.modelName,
                'classify_feedback',
                response.processingTimeMs || 0,
                response.tokensUsed,
                logContext
            );

            const parsedJson = extractAndParseJSON(response.text);
            return FeedbackClassificationSchema.parse(parsedJson);

        }, 2); // Less retries for feedback than receipt extraction

        return classification;

    } catch (error) {
        logger.aiError(
            'unknown',
            'unknown',
            'classify_feedback',
            error as Error,
            logContext
        );

        // Fallback on error
        return {
            type: 'general',
            confidence: 0,
            summary: 'Classification failed'
        };
    }
}
