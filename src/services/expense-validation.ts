import { AI_CONFIG } from '@/lib/config';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ExpenseValidationData {
  title?: string;
  amount?: string | number;
  date?: string;
  members?: any[];
}

export class ExpenseValidationService {
  static validateExpenseDetails(data: ExpenseValidationData): ValidationResult {
    const errors: string[] = [];

    // Title validation
    if (!data.title?.trim()) {
      errors.push("Please enter an expense title.");
    }

    // Amount validation
    const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
    if (!data.amount || isNaN(amount!) || amount! <= 0) {
      errors.push("Please enter a valid expense amount.");
    }

    // Date validation
    if (!data.date) {
      errors.push("Please select an expense date.");
    }

    // Members validation
    if (!data.members || data.members.length === 0) {
      errors.push("Please select at least one member.");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validatePriceInput(value: string): ValidationResult {
    const errors: string[] = [];

    // Allow empty string for intermediate input
    if (value === '') {
      return { isValid: true, errors: [] };
    }

    // Check if it's a valid number
    const num = parseFloat(value);
    if (isNaN(num)) {
      errors.push("Please enter a valid number.");
    } else if (num < 0) {
      errors.push("Amount cannot be negative.");
    } else if (num > 999999.99) {
      errors.push("Amount is too large.");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateItemSplits(itemSplits: any[], totalCost: number): ValidationResult {
    const errors: string[] = [];

    // Check if all items have at least one member selected
    for (let i = 0; i < itemSplits.length; i++) {
      const split = itemSplits[i];
      if (!split.sharedBy || split.sharedBy.length === 0) {
        errors.push(`Item ${i + 1} must have at least one member selected.`);
      }
    }

    // Check if total allocated amount matches total cost
    const totalAllocated = itemSplits.reduce((sum, split) => {
      if (split.splitType === 'equal') {
        return sum + (split.price || 0);
      } else {
        return sum + (Object.values(split.customAmounts || {}) as number[]).reduce((a: number, b: number) => a + b, 0);
      }
    }, 0);

    const difference = Math.abs(totalAllocated - totalCost);
    if (difference > AI_CONFIG.ROUNDING_TOLERANCE) { // Allow for small rounding differences
      errors.push("Total allocated amount must equal the total bill amount.");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 