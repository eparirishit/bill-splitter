import { AIProvider, AIProviderConfig } from "./providers/base-provider";
import { GoogleGeminiProvider } from "./providers/google-gemini-provider";
import { OpenRouterProvider } from "./providers/openrouter-provider";

export type ProviderType = "google-gemini" | "openrouter" | "local";

export class AIServiceFactory {
  static createProvider(type: ProviderType, config: AIProviderConfig): AIProvider {
    switch (type) {
      case "google-gemini":
        return new GoogleGeminiProvider(config);
      case "openrouter":
        return new OpenRouterProvider(config);
      case "local":
        // Future implementation for local LLMs
        throw new Error("Local provider not yet implemented");
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }
} 