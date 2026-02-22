import type { CreateExpense, ExtractReceiptDataOutput, FinalSplit } from "@/types";

export interface ExpensePayloadOptions {
  storeName: string;
  date: string;
  expenseNotes: string;
  payerId: string;
  groupId?: number; // Optional for friend expenses (defaults to 0)
}

export class ExpensePayloadService {
  static generateExpensePayload(
    finalSplits: FinalSplit[],
    totalCost: number,
    options: ExpensePayloadOptions
  ): CreateExpense {
    const { storeName, date, expenseNotes, payerId, groupId } = options;
    const numericPayerId = parseInt(payerId);

    // Adjust final splits to ensure exact total match
    const adjustedSplits = [...finalSplits];
    let totalOwedSoFar = 0;

    // Calculate all but the last split normally
    for (let i = 0; i < adjustedSplits.length - 1; i++) {
      adjustedSplits[i].amountOwed = Math.round(adjustedSplits[i].amountOwed * 100) / 100;
      totalOwedSoFar += adjustedSplits[i].amountOwed;
    }

    // Last person gets the remainder to ensure exact total
    if (adjustedSplits.length > 0) {
      adjustedSplits[adjustedSplits.length - 1].amountOwed = totalCost - totalOwedSoFar;
    }

    const expensePayload: CreateExpense = {
      cost: totalCost.toFixed(2),
      description: storeName,
      group_id: groupId ?? 0, // Default to 0 for friend expenses
      date: this.formatToLocalDateString(date),
      details: expenseNotes,
      currency_code: 'USD',
      category_id: 18,
      split_equally: false,
    };

    adjustedSplits.forEach((split, index) => {
      const paidShare = parseInt(split.userId) === numericPayerId ? totalCost.toFixed(2) : '0.00';
      const owedShare = split.amountOwed.toFixed(2);

      expensePayload[`users__${index}__user_id`] = parseInt(split.userId);
      expensePayload[`users__${index}__paid_share`] = paidShare;
      expensePayload[`users__${index}__owed_share`] = owedShare;
    });

    return expensePayload;
  }

  static generateExpenseNotes(
    billData: ExtractReceiptDataOutput,
    storeName: string,
    date: string
  ): string {
    const subtotal = billData.items.reduce((sum, item) => sum + item.price, 0);
    let notes = `Store: ${storeName}\nDate: ${this.formatToLocalDateString(date)}\n\nItems Subtotal: ${this.formatCurrency(subtotal)}\n`;

    billData.items.forEach(item => {
      notes += `- ${item.name}: ${this.formatCurrency(item.price)}\n`;
    });

    if ((billData.taxes ?? 0) > 0) {
      notes += `Tax: ${this.formatCurrency(billData.taxes ?? 0)}\n`;
    }
    if ((billData.otherCharges ?? 0) > 0) {
      notes += `Other Charges: ${this.formatCurrency(billData.otherCharges ?? 0)}\n`;
    }
    if ((billData.discount ?? 0) > 0) {
      notes += `Discount Applied: -${this.formatCurrency(billData.discount ?? 0)}\n`;
    }
    notes += `\nGrand Total (on receipt): ${this.formatCurrency(billData.totalCost)}`;
    if (billData.discrepancyFlag) {
      notes += `\n\nNote: Original bill data discrepancy: ${billData.discrepancyMessage}`;
    }
    return notes;
  }

  static validateExpensePayload(
    expensePayload: CreateExpense,
    totalCost: number
  ): { isValid: boolean; error?: string } {
    // Final validation
    const totalOwed = parseFloat(expensePayload.cost);
    if (Math.abs(totalOwed - totalCost) > 0.005) {
      return {
        isValid: false,
        error: `Validation Error: Split total (${this.formatCurrency(totalOwed)}) doesn't match bill total (${this.formatCurrency(totalCost)}).`
      };
    }

    return { isValid: true };
  }

  private static formatToLocalDateString(dateInput: string | Date): string {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    // Use toLocaleDateString with 'en-CA' locale which produces YYYY-MM-DD in local timezone
    const date = new Date(dateInput);
    return date.toLocaleDateString('en-CA');
  }

  private static formatCurrency(amount: number | undefined): string {
    if (amount === undefined) return '-';
    const value = (typeof amount === 'number' && !isNaN(amount)) ? amount : 0;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }
} 