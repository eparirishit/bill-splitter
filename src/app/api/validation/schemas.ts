import { z } from 'zod';

export const CreateExpenseSchema = z.object({
  cost: z.string().regex(/^\d+\.\d{2}$/, 'Cost must be in format X.XX'),
  description: z.string().min(1, 'Description is required').max(200, 'Description too long'),
  group_id: z.number().int().positive('Invalid group ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  details: z.string().optional(),
  currency_code: z.string().length(3, 'Currency code must be 3 characters'),
  category_id: z.number().int().positive('Invalid category ID'),
  split_equally: z.boolean(),
}).passthrough(); // Allow additional fields for user splits

export const GroupIdSchema = z.object({
  groupId: z.string().regex(/^\d+$/, 'Group ID must be a number'),
});

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    
    throw new ValidationError('Invalid request data', errors);
  }
  
  return result.data;
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
