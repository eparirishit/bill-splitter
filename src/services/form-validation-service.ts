export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export class FormValidationService {
    /**
     * Validate expense title
     */
    static validateExpenseTitle(title: string): ValidationResult {
        const trimmedTitle = title.trim();

        if (!trimmedTitle) {
            return { isValid: false, error: "Please enter an expense title." };
        }

        if (trimmedTitle.length > 100) {
            return { isValid: false, error: "Title must be 100 characters or less." };
        }

        return { isValid: true };
    }

    /**
     * Validate expense amount
     */
    static validateExpenseAmount(amount: string): ValidationResult {
        if (!amount) {
            return { isValid: false, error: "Please enter an expense amount." };
        }

        const parsedAmount = parseFloat(amount);

        if (isNaN(parsedAmount)) {
            return { isValid: false, error: "Please enter a valid expense amount." };
        }

        if (parsedAmount <= 0) {
            return { isValid: false, error: "Amount must be greater than zero." };
        }

        if (parsedAmount > 999999.99) {
            return { isValid: false, error: "Amount cannot exceed $999,999.99." };
        }

        return { isValid: true };
    }

    /**
     * Validate expense date
     */
    static validateExpenseDate(date: string): ValidationResult {
        if (!date) {
            return { isValid: false, error: "Please select an expense date." };
        }

        const selectedDate = new Date(date);
        const today = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(today.getFullYear() - 1);

        if (selectedDate > today) {
            return { isValid: false, error: "Date cannot be in the future." };
        }

        if (selectedDate < oneYearAgo) {
            return { isValid: false, error: "Date cannot be more than one year ago." };
        }

        return { isValid: true };
    }

    /**
     * Validate notes length
     */
    static validateNotes(notes: string, maxLength: number = 500): ValidationResult {
        if (notes.length > maxLength) {
            return { isValid: false, error: `Notes must be ${maxLength} characters or less.` };
        }

        return { isValid: true };
    }

    /**
     * Format currency for display
     */
    static formatCurrencyDisplay(value: string): string {
        const num = parseFloat(value);
        return isNaN(num) ? '$0.00' : new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(num);
    }

    /**
     * Validate complete manual expense form
     */
    static validateManualExpenseForm(data: {
        title: string;
        amount: string;
        date: string;
        notes?: string;
    }): ValidationResult {
        const titleValidation = this.validateExpenseTitle(data.title);
        if (!titleValidation.isValid) {return titleValidation;}

        const amountValidation = this.validateExpenseAmount(data.amount);
        if (!amountValidation.isValid) {return amountValidation;}

        const dateValidation = this.validateExpenseDate(data.date);
        if (!dateValidation.isValid) {return dateValidation;}

        if (data.notes) {
            const notesValidation = this.validateNotes(data.notes);
            if (!notesValidation.isValid) {return notesValidation;}
        }

        return { isValid: true };
    }
}
