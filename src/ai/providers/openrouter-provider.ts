import { AIProvider, AIProviderConfig, AIRequest, AIResponse } from "./base-provider";

export class OpenRouterProvider implements AIProvider {
  name = "openrouter";
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.validateConfig(config);
    this.config = config;
  }

  validateConfig(config: AIProviderConfig): void {
    if (!config.apiKey) {
      throw new Error("OpenRouter API key is required");
    }
    if (!config.modelName) {
      throw new Error("Model name is required");
    }
  }

  async generateContent(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    const messages: any[] = [
      { role: "user", content: [] }
    ];

    // Add text content
    if (request.prompt) {
      messages[0].content.push({ type: "text", text: request.prompt });
    }

    // Add image content
    if (request.imageDataUri) {
      messages[0].content.push({
        type: "image_url",
        image_url: { url: request.imageDataUri }
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": this.config.baseUrl || "http://localhost:3000",
        "X-Title": "SplitScan"
      },
      body: JSON.stringify({
        model: this.config.modelName,
        messages,
        temperature: this.config.temperature || 0.1,
        max_tokens: this.config.maxTokens || 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const processingTimeMs = Date.now() - startTime;
    
    return {
      text: data.choices[0].message.content,
      blocked: false, // OpenRouter doesn't have the same blocking mechanism
      modelUsed: this.config.modelName,
      providerName: this.name,
      tokensUsed: data.usage?.total_tokens,
      processingTimeMs,
    };
  }
} 