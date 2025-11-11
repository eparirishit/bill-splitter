import { z } from 'zod';

export const ExtractReceiptDataInputSchema = z.object({
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "A photo of a bill, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Deprecated: use imageUrl instead."
    ),
  imageUrl: z
    .string()
    .url()
    .optional()
    .describe(
      "A URL to the image stored in Supabase storage. Preferred over photoDataUri for production."
    ),
}).refine(
  (data) => data.photoDataUri || data.imageUrl,
  {
    message: "Either photoDataUri or imageUrl must be provided",
  }
);

export type ExtractReceiptDataInput = z.infer<typeof ExtractReceiptDataInputSchema>;

export const AIOutputSchema = z.object({
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

export type AIOutput = z.infer<typeof AIOutputSchema>;

export const ExtractReceiptDataOutputSchema = AIOutputSchema.extend({
  discrepancyFlag: z.boolean().describe('Whether there is a discrepancy between the printed total cost and the sum of item prices + taxes + other charges - discount.'),
  discrepancyMessage: z.string().optional().describe('A message describing the discrepancy, if any.'),
});

export type ExtractReceiptDataOutput = z.infer<typeof ExtractReceiptDataOutputSchema>;

export interface DiscrepancyCheck {
  flag: boolean;
  message?: string;
}
