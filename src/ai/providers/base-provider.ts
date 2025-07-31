export interface AIProviderConfig {
  modelName: string;
  temperature?: number;
  maxTokens?: number;
  apiKey: string;
  baseUrl?: string;
}

export interface AIRequest {
  prompt: string;
  imageDataUri?: string;
  mimeType?: string;
}

export interface AIResponse {
  text: string;
  blocked?: boolean;
  blockReason?: string;
  modelUsed?: string;
  providerName?: string;
  tokensUsed?: number;
  processingTimeMs?: number;
}

export interface AIProvider {
  name: string;
  generateContent(request: AIRequest): Promise<AIResponse>;
  validateConfig(config: AIProviderConfig): void;
} 