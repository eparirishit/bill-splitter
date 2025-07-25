import type { ExtractReceiptDataOutput } from '@/types';
import { formatCurrency } from '@/lib/currency';

export class NotesService {
    /**
     * Generate expense notes for receipt scanning
     */
    static generateReceiptNotes(
        billData: ExtractReceiptDataOutput,
        storeName: string,
        date: string
    ): string {
        const subtotal = billData.items.reduce((sum, item) => sum + item.price, 0);
        let notes = `Store: ${storeName}\nDate: ${this.formatToLocalDateString(date)}\n\nItems Subtotal: ${formatCurrency(subtotal)}\n`;

        billData.items.forEach(item => {
            notes += `- ${item.name}: ${formatCurrency(item.price)}\n`;
        });

        if ((billData.taxes ?? 0) > 0) {
            notes += `Tax: ${formatCurrency(billData.taxes ?? 0)}\n`;
        }

        if ((billData.otherCharges ?? 0) > 0) {
            notes += `Other Charges: ${formatCurrency(billData.otherCharges ?? 0)}\n`;
        }

        if ((billData.discount ?? 0) > 0) {
            notes += `Discount Applied: -${formatCurrency(billData.discount ?? 0)}\n`;
        }

        notes += `\nGrand Total (on receipt): ${formatCurrency(billData.totalCost)}`;

        if (billData.discrepancyFlag) {
            notes += `\n\nNote: Original bill data discrepancy: ${billData.discrepancyMessage}`;
        }

        return notes;
    }

    /**
     * Format date string to YYYY-MM-DD
     */
    static formatToLocalDateString(dateInput: string | Date): string {
        if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            return dateInput;
        }
        const date = new Date(dateInput);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
