'use server';
/**
 * @fileOverview Extracts data from an image of a receipt using Google Generative AI SDK.
 *
 * - extractReceiptData - A function that handles the data extraction process.
 * - ExtractReceiptDataInput - The input type for the extractReceiptData function.
 * - ExtractReceiptDataOutput - The return type for the extractReceiptData function.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { z } from 'zod'; // Assuming Zod is available for schema validation

const ExtractReceiptDataInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a bill, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractReceiptDataInput = z.infer<typeof ExtractReceiptDataInputSchema>;

// Schema for the AI's direct output (subset of the final output)
const AIOutputSchema = z.object({
  storeName: z.string().describe('The name of the store.'),
  date: z.string().describe('The date of the purchase (YYYY-MM-DD).'),
  items: z.array(
    z.object({
      name: z.string().describe('The name of the item.'),
      price: z.number().describe('The price of the item.'),
    })
  ).describe('A list of items purchased.'),
  totalCost: z.number().describe('The total cost of the bill as printed on the receipt.'),
  taxes: z.number().optional().nullable().describe('The amount of taxes paid, if available.'),
  otherCharges: z.number().optional().nullable().describe('Any other charges on the bill, if available.'),
  discount: z.number().optional().nullable().describe('The total discount amount, if available.'),
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
    ExtractReceiptDataInputSchema.parse(input); // Validate input
  } catch (error) {
    console.error("Invalid input for extractReceiptData:", error);
    throw new Error("Invalid input: " + (error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : String(error)));
  }

  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable is not set.");
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-04-17",
    safetySettings,
    generationConfig: {
      temperature: 1, // Lower temperature for more factual extraction
      // responseMimeType: "application/json", // Consider if your model version supports this for direct JSON output
    }
  });

  const { photoDataUri } = input;
  const match = photoDataUri.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid photoDataUri format. Expected data URI with Base64 encoding.');
  }
  const mimeType = match[1];
  const base64Data = match[2];

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };

  const textPrompt = `Extract the following fields:

1. **Store Name**:
   - Clearly identify and extract the store's name as printed on the receipt. Do not assume or guess.

2. **Date**:
   - Extract the most clearly visible and logical date as the purchase or delivery date in the format YYYY-MM-DD.

3. **Items Purchased**:
   - Extract every purchased item, including:
     - The item name **exactly as printed** on the receipt.
     - The price **explicitly associated** with the item.
   - **Important Rules**:
     - If an item shows multiple quantities with a unit price and total, list each quantity separately, using the total price for each line.
     - **Do NOT duplicate items**.
     - **Do NOT include** category totals, section headers, or non-item rows (like subtotals, discounts, tax rows) as purchased items.
     - Ensure each item is listed **only once**, even if it's grouped or summarized.

4. **Financial Details**:
   - **totalCost**: The final total charge shown on the receipt (e.g., "Total", "Amount Charged", etc.).
   - **taxes**: Extract only if explicitly labeled as tax/sales tax. Set to 0 if not present.
   - **otherCharges**: Include fees like service fees, tips, delivery charges if explicitly listed. Otherwise set to 0.
   - **discount**: Include any explicit promotions, credits, or reductions labeled as discounts or savings. Otherwise set to 0.

Ensure all monetary values are numbers. Return the extracted data strictly in the following JSON format:

{
  "storeName": "Store ABC",
  "date": "2025-05-06",
  "items": [{"name": "Milk", "price": 5.99}, {"name": "Eggs (12ct)", "price": 3.49}],
  "totalCost": 20.97,
  "taxes": 0.80,
  "otherCharges": 2.50,
  "discount": 1.50
}

Here is the receipt image:`;

  let aiOutput: AIOutput;
  try {
    const result = await model.generateContent([textPrompt, imagePart]);
    const response = result.response;
    const aiResponseText = response.text();

    const jsonMatch = aiResponseText.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*})/);
    if (!jsonMatch) {
        console.error("No JSON found in AI response. Raw response:", aiResponseText);
        throw new Error("AI response does not contain valid JSON.");
    }
    // Prioritize the content within ```json ... ``` if present, otherwise take the first brace-enclosed object
    const cleanedJsonString = jsonMatch[1] || jsonMatch[2];

    const parsedJson = JSON.parse(cleanedJsonString);
    aiOutput = AIOutputSchema.parse(parsedJson);
  } catch (error) {
    console.error("Error processing AI response:", error instanceof Error ? error.message : String(error));
    // console.error("Raw AI response text that caused error:", (error as any).aiResponseText || "N/A"); // Be cautious logging full response if it's very large or sensitive
    throw new Error("Failed to get a valid structured response from AI.");
  }

  const items = Array.isArray(aiOutput?.items) ? aiOutput.items : [];
  const taxes = (typeof aiOutput?.taxes === 'number' && !isNaN(aiOutput.taxes)) ? aiOutput.taxes : 0;
  const otherCharges = (typeof aiOutput?.otherCharges === 'number' && !isNaN(aiOutput.otherCharges)) ? aiOutput.otherCharges : 0;
  const discount = (typeof aiOutput?.discount === 'number' && !isNaN(aiOutput.discount)) ? aiOutput.discount : 0;
  const totalCostFromReceipt = (typeof aiOutput?.totalCost === 'number' && !isNaN(aiOutput.totalCost)) ? aiOutput.totalCost : 0;

  let calculatedSum = 0;
  items.forEach(item => {
    if (typeof item?.price === 'number' && !isNaN(item.price)) {
      calculatedSum += item.price;
    }
  });
  calculatedSum += taxes;
  calculatedSum += otherCharges;
  calculatedSum -= discount;

  const roundedCalculatedSum = parseFloat(calculatedSum.toFixed(2));
  const roundedTotalCostFromReceipt = parseFloat(totalCostFromReceipt.toFixed(2));

  let discrepancyFlag = false;
  let discrepancyMessage: string | undefined = undefined;

  if (Math.abs(roundedCalculatedSum - roundedTotalCostFromReceipt) > 0.01) {
    discrepancyFlag = true;
    discrepancyMessage = `The total cost on receipt (${roundedTotalCostFromReceipt.toFixed(2)}) does not match the sum of items + taxes + other charges - discount (${roundedCalculatedSum.toFixed(2)}).`;
    console.warn("Discrepancy Found:", discrepancyMessage);
  }

  return {
    storeName: aiOutput?.storeName ?? "Unknown Store",
    date: aiOutput?.date ?? new Date().toISOString().split('T')[0],
    items: items,
    totalCost: roundedTotalCostFromReceipt,
    taxes: taxes !== 0 ? taxes : undefined,
    otherCharges: otherCharges !== 0 ? otherCharges : undefined,
    discount: discount !== 0 ? discount : undefined,
    discrepancyFlag,
    discrepancyMessage,
  };
}

