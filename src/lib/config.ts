import { ProviderType } from "@/ai/ai-service-factory";
import { ConfigurationError } from "@/ai/errors";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Splitwise OAuth Configuration (server-side only)
export const SPLITWISE_CONFIG = {
  CLIENT_ID: process.env.SPLITWISE_CLIENT_ID!,
  CLIENT_SECRET: process.env.SPLITWISE_CLIENT_SECRET!,
  REDIRECT_URI: process.env.SPLITWISE_REDIRECT_URI!,
  AUTHORIZE_URL: process.env.SPLITWISE_AUTHORIZE_URL || 'https://secure.splitwise.com/oauth/authorize',
  TOKEN_URL: process.env.SPLITWISE_TOKEN_URL || 'https://secure.splitwise.com/oauth/token',
  API_BASE_URL: process.env.SPLITWISE_API_BASE_URL || 'https://secure.splitwise.com/api/v3.0',
} as const;

// App Configuration
export const APP_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
  AUTH_COOKIE_NAME: 'sw_access_token',
  OAUTH_STATE_COOKIE_NAME: 'oauth_state',
} as const;

// Supabase Storage Configuration
export const SUPABASE_STORAGE_CONFIG = {
  BUCKET_NAME: process.env.SUPABASE_STORAGE_BUCKET_NAME || 'receipt-images',
  SIGNED_URL_EXPIRY_SECONDS: parseInt(process.env.SUPABASE_SIGNED_URL_EXPIRY_SECONDS || '7200', 10), // Default: 2 hours (7200 seconds)
  SIGNED_URL_EXPIRY_HOURS: parseFloat(process.env.SUPABASE_SIGNED_URL_EXPIRY_HOURS || '2'), // Default: 2 hours
} as const;

// AI Configuration (client-safe)
export const AI_CONFIG = {
  DISCREPANCYY_TOLERANCE: 0.02,
  MAX_IMAGE_SIZE_MB: 10,
  MAX_PAYLOAD_SIZE_KB: 3072, // 3MB for Vercel limits
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  
  // File upload configuration
  MAX_FILE_SIZE_MB: parseFloat(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '5'), // (default: 5MB)
  
  // Provider configuration
  PROVIDER: (process.env.AI_PROVIDER || "google-gemini") as ProviderType,
  
  // Provider-specific configs
  GOOGLE_GEMINI: {
    MODEL_NAME: process.env.GOOGLE_MODEL_NAME || "gemini-2.5-flash",
    API_KEY: process.env.GOOGLE_API_KEY!,
    TEMPERATURE: 0.1,
    MAX_TOKENS: 8192,
  },
  
  OPENROUTER: {
    MODEL_NAME: process.env.OPENROUTER_MODEL_NAME || "anthropic/claude-3.5-sonnet",
    API_KEY: process.env.OPENROUTER_API_KEY!,
    BASE_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    TEMPERATURE: 0.1,
    MAX_TOKENS: 8192,
  },
} as const;

export function createGoogleAIClient(): GoogleGenerativeAI {
  if (typeof window !== 'undefined') {
    throw new ConfigurationError("Google AI client can only be created on the server side.");
  }
  
  if (!process.env.GOOGLE_API_KEY) {
    throw new ConfigurationError("GOOGLE_API_KEY environment variable is not set.");
  }
  return new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
}

export const EXTRACTION_PROMPT = `You are an expert receipt data extraction system. Analyze the provided receipt image and extract information with high accuracy. Be precise and extract ONLY what is clearly visible on the receipt - do not guess or infer information that is not explicitly shown.

**CRITICAL INSTRUCTIONS:**
1. **Store Name**: Extract the exact business name as printed on the receipt header (not address or other info)
2. **Date**: Find the transaction/purchase date in YYYY-MM-DD format only. Only extract dates that are clearly visible - do not invent dates.
3. **Items**: Extract ONLY purchased items with their individual prices:
   - Use exact item names as printed on the receipt
   - Include quantity in name if shown (e.g., "Bananas (3 lbs)")
   - DO NOT include: subtotals, tax lines, fee lines, discounts, category headers, or summary lines
   - Each item should have ONE price (the final price for that line item)
   - If an item name or price is unclear or partially obscured, do not guess - only extract clearly visible items
4. **Financial Totals**:
   - totalCost: The final amount charged (look for "Total", "Amount Due", "Final Total", "Amount Paid")
   - taxes: Only explicit tax amounts (sales tax, VAT, etc.) that are clearly labeled - set to 0 if not found or unclear
   - otherCharges: Service fees, delivery fees, tips if explicitly listed and clearly visible - set to 0 if not found
   - discount: Any promotional discounts, coupons, or credits that are clearly labeled - set to 0 if not found

**ACCURACY REQUIREMENTS:**
- Extract ONLY information that is clearly visible and readable in the image
- Do NOT hallucinate or invent information not present on the receipt
- Do NOT infer or estimate values - use only what is explicitly shown
- Double-check all numbers match exactly what appears on the receipt

**VALIDATION RULES:**
- All prices must be positive numbers
- Items array must contain at least one item
- Store name cannot be empty
- Date must be valid YYYY-MM-DD format

**OUTPUT FORMAT:**
Return ONLY valid JSON in this exact structure (no markdown, no explanations, no additional text):

{
  "storeName": "Walmart Supercenter",
  "date": "2024-01-15",
  "items": [
    {"name": "Milk 2% Gallon", "price": 3.98},
    {"name": "Bread Whole Wheat", "price": 2.50}
  ],
  "totalCost": 7.23,
  "taxes": 0.75,
  "otherCharges": 0,
  "discount": 0
}

Analyze the receipt image now and extract only the information clearly visible:`;

// Validate required environment variables (server-side only)
if (typeof window === 'undefined') {
  const requiredEnvVars = ['SPLITWISE_CLIENT_ID', 'SPLITWISE_CLIENT_SECRET', 'SPLITWISE_REDIRECT_URI'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }
}
