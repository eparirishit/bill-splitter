'use server';
/**
 * @fileOverview Extracts data from an image of a receipt using Google Generative AI SDK.
 *
 * - extractReceiptData - A function that handles the data extraction process.
 * - ExtractReceiptDataInput - The input type for the extractReceiptData function.
 * - ExtractReceiptDataOutput - The return type for the extractReceiptData function.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { z } from 'zod';

const ExtractReceiptDataInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a bill, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractReceiptDataInput = z.infer<typeof ExtractReceiptDataInputSchema>;

// Enhanced AI output schema with better validation
const AIOutputSchema = z.object({
  storeName: z.string().min(1).describe('The name of the store.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('The date of the purchase (YYYY-MM-DD).'),
  items: z.array(
    z.object({
      name: z.string().min(1).describe('The name of the item.'),
      price: z.number().positive().describe('The price of the item.'),
    })
  ).min(1).describe('A list of items purchased.'),
  totalCost: z.number().positive().describe('The total cost of the bill as printed on the receipt.'),
  taxes: z.number().min(0).optional().nullable().describe('The amount of taxes paid, if available.'),
  otherCharges: z.number().min(0).optional().nullable().describe('Any other charges on the bill, if available.'),
  discount: z.number().min(0).optional().nullable().describe('The total discount amount, if available.'),
});
type AIOutput = z.infer<typeof AIOutputSchema>;

// Schema for the final output of the extractReceiptData function
const ExtractReceiptDataOutputSchema = AIOutputSchema.extend({
  discrepancyFlag: z.boolean().describe('Whether there is a discrepancy between the printed total cost and the sum of item prices + taxes + other charges - discount.'),
  discrepancyMessage: z.string().optional().describe('A message describing the discrepancy, if any.'),
});
export type ExtractReceiptDataOutput = z.infer<typeof ExtractReceiptDataOutputSchema>;

export async function extractReceiptData(input: ExtractReceiptDataInput): Promise<ExtractReceiptDataOutput> {
  try {
    ExtractReceiptDataInputSchema.parse(input);
  } catch (error) {
    console.error("Invalid input for extractReceiptData:", error);
    throw new Error("Invalid input: " + (error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : String(error)));
  }

  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable is not set.");
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

  // Enhanced safety settings
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    safetySettings,
    generationConfig: {
      temperature: 0.1, // Lower temperature for more consistent extraction
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192,
    }
  });

  // Enhanced image validation
  const { photoDataUri } = input;
  const match = photoDataUri.match(/^data:(image\/(?:jpeg|jpg|png|webp|heic|heif));base64,(.+)$/i);
  if (!match) {
    throw new Error('Invalid photoDataUri format. Expected data URI with supported image format and Base64 encoding.');
  }
  const mimeType = match[1];
  const base64Data = match[2];

  // Validate base64 data
  try {
    atob(base64Data);
  } catch {
    throw new Error('Invalid Base64 data in photoDataUri.');
  }

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };

  // Enhanced and more specific prompt
  const textPrompt = `You are an expert receipt data extraction system. Analyze the provided receipt image and extract information with high accuracy.

**CRITICAL INSTRUCTIONS:**
1. **Store Name**: Extract the exact business name as printed on the receipt header (not address or other info)
2. **Date**: Find the transaction/purchase date in YYYY-MM-DD format only
3. **Items**: Extract ONLY purchased items with their individual prices:
   - Use exact item names as printed
   - Include quantity in name if shown (e.g., "Bananas (3 lbs)")
   - DO NOT include: subtotals, tax lines, fee lines, discounts, or category headers
   - Each item should have ONE price (the final price for that line item)
4. **Financial Totals**:
   - totalCost: The final amount charged (look for "Total", "Amount Due", "Final Total")
   - taxes: Only explicit tax amounts (sales tax, VAT, etc.) - set to 0 if not found
   - otherCharges: Service fees, delivery fees, tips if explicitly listed - set to 0 if not found  
   - discount: Any promotional discounts, coupons, or credits - set to 0 if not found

**VALIDATION RULES:**
- All prices must be positive numbers
- Items array must contain at least one item
- Store name cannot be empty
- Date must be valid YYYY-MM-DD format

**OUTPUT FORMAT:**
Return ONLY valid JSON in this exact structure (no markdown, no explanations):

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

Analyze the receipt image now:`;

  let aiOutput!: AIOutput;
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent([textPrompt, imagePart]);
      const response = result.response;
      
      // Check for blocked content
      if (response.promptFeedback?.blockReason) {
        throw new Error(`Content was blocked: ${response.promptFeedback.blockReason}`);
      }

      const aiResponseText = response.text();
      
      if (!aiResponseText || aiResponseText.trim().length === 0) {
        throw new Error("AI returned empty response");
      }

      // Enhanced JSON extraction with multiple fallback patterns
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
          throw new Error("No JSON structure found in AI response");
        }
      }

      // Clean and parse JSON
      let parsedJson;
      try {
        // Remove any trailing commas and fix common JSON issues
        const cleanedJson = jsonString
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/\n/g, ' ')          // Remove newlines
          .trim();
        
        parsedJson = JSON.parse(cleanedJson);
      } catch (parseError) {
        throw new Error(`JSON parsing failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      // Validate against schema
      aiOutput = AIOutputSchema.parse(parsedJson);
      break; // Success, exit retry loop

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Attempt ${attempt} failed:`, lastError.message);
      
      if (attempt === maxRetries) {
        console.error("All extraction attempts failed. Last error:", lastError.message);
        throw new Error(`Failed to extract receipt data after ${maxRetries} attempts: ${lastError.message}`);
      }
      
      // Brief delay before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  // Enhanced discrepancy detection with better tolerance
  const items = aiOutput.items;
  const taxes = aiOutput.taxes ?? 0;
  const otherCharges = aiOutput.otherCharges ?? 0;
  const discount = aiOutput.discount ?? 0;
  const totalCostFromReceipt = aiOutput.totalCost;

  // Calculate sum with proper rounding
  const itemsSum = items.reduce((sum, item) => sum + item.price, 0);
  const calculatedTotal = Math.round((itemsSum + taxes + otherCharges - discount) * 100) / 100;
  const receiptTotal = Math.round(totalCostFromReceipt * 100) / 100;

  let discrepancyFlag = false;
  let discrepancyMessage: string | undefined = undefined;

  // Use a reasonable tolerance (2 cents) for discrepancy detection
  const tolerance = 0.02;
  if (Math.abs(calculatedTotal - receiptTotal) > tolerance) {
    discrepancyFlag = true;
    const difference = Math.abs(calculatedTotal - receiptTotal);
    discrepancyMessage = `Receipt total ($${receiptTotal.toFixed(2)}) differs from calculated total ($${calculatedTotal.toFixed(2)}) by $${difference.toFixed(2)}. This may indicate missing items, fees, or rounding differences.`;
    console.warn("Discrepancy detected:", discrepancyMessage);
  }

  // Additional validation checks
  if (items.length === 0) {
    throw new Error("No items were extracted from the receipt");
  }

  if (totalCostFromReceipt <= 0) {
    throw new Error("Invalid total cost extracted from receipt");
  }

  return {
    storeName: aiOutput.storeName.trim(),
    date: aiOutput.date,
    items: items.map(item => ({
      name: item.name.trim(),
      price: Math.round(item.price * 100) / 100, // Ensure proper rounding
    })),
    totalCost: receiptTotal,
    taxes: taxes > 0 ? Math.round(taxes * 100) / 100 : undefined,
    otherCharges: otherCharges > 0 ? Math.round(otherCharges * 100) / 100 : undefined,
    discount: discount > 0 ? Math.round(discount * 100) / 100 : undefined,
    discrepancyFlag,
    discrepancyMessage,
  };
}

