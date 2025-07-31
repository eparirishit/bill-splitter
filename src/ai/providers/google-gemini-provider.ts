import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { AIProvider, AIProviderConfig, AIRequest, AIResponse } from "./base-provider";

export class GoogleGeminiProvider implements AIProvider {
  name = "google-gemini";
  private client: GoogleGenerativeAI;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.validateConfig(config);
    this.config = config;
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  validateConfig(config: AIProviderConfig): void {
    if (!config.apiKey) {
      throw new Error("Google API key is required");
    }
    if (!config.modelName) {
      throw new Error("Model name is required");
    }
  }

  async generateContent(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    const model = this.client.getGenerativeModel({
      model: this.config.modelName,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
      generationConfig: {
        temperature: this.config.temperature || 0.1,
        maxOutputTokens: this.config.maxTokens || 8192,
      },
    });

    const content: any[] = [request.prompt];
    
    if (request.imageDataUri) {
      const { mimeType, base64Data } = this.parseDataUri(request.imageDataUri);
      content.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      });
    }

    const result = await model.generateContent(content);
    const response = result.response;
    const processingTimeMs = Date.now() - startTime;

    return {
      text: response.text(),
      blocked: !!response.promptFeedback?.blockReason,
      blockReason: response.promptFeedback?.blockReason,
      modelUsed: this.config.modelName,
      providerName: this.name,
      tokensUsed: response.usageMetadata?.totalTokenCount,
      processingTimeMs,
    };
  }

  private parseDataUri(dataUri: string): { mimeType: string; base64Data: string } {
    const match = dataUri.match(/^data:(image\/(?:jpeg|jpg|png|webp|heic|heif));base64,(.+)$/i);
    if (!match) {
      throw new Error('Invalid image data URI format');
    }
    return { mimeType: match[1], base64Data: match[2] };
  }
} 