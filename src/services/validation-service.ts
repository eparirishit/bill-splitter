import type {
    ExtractReceiptDataOutput,
    SplitwiseUser,
    ItemSplit,
    FinalSplit,
} from "@/types";

export class ValidationService {
    /**
     * Validate splits for receipt scanning flow
     */
    static validateReceiptSplits(
        billData: ExtractReceiptDataOutput,
        itemSplits: ItemSplit[],
        taxSplitMembers: string[],
        otherChargesSplitMembers: string[]
    ): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check that all items have valid splits
        for (const split of itemSplits) {
            if (split.splitType === "custom" && split.sharedBy.length === 0) {
                const itemIndex = parseInt(split.itemId.split("-")[1]);
                const item = billData.items[itemIndex];
                errors.push(
                    `Please select members for the custom split of: ${item?.name || split.itemId
                    }.`
                );
            }
        }

        // Check tax splits
        if (
            typeof billData.taxes === "number" &&
            billData.taxes > 0 &&
            taxSplitMembers.length === 0
        ) {
            errors.push("Please select members to split the tax.");
        }

        // Check other charges splits
        if (
            typeof billData.otherCharges === "number" &&
            billData.otherCharges > 0 &&
            otherChargesSplitMembers.length === 0
        ) {
            errors.push("Please select members to split other charges.");
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Validate manual expense splits
     */
    static validateManualSplits(
        expenseData: { amount: number; splitType: "equal" | "custom" },
        customAmounts?: Record<string, number>
    ): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (expenseData.splitType === "custom" && customAmounts) {
            const totalCustom = Object.values(customAmounts).reduce(
                (sum, val) => sum + val,
                0
            );
            const difference = Math.abs(totalCustom - expenseData.amount);

            if (difference > 0.01) {
                errors.push(
                    `Custom amounts total $${totalCustom.toFixed(
                        2
                    )} but expense is $${expenseData.amount.toFixed(2)}`
                );
            }

            // Check for negative or zero amounts
            const invalidAmounts = Object.values(customAmounts).some(
                (amount) => amount <= 0
            );
            if (invalidAmounts) {
                errors.push("All amounts must be greater than zero.");
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Validate final splits match target total
     */
    static validateFinalSplits(
        finalSplits: FinalSplit[],
        targetTotal: number,
        tolerance: number = 0.015
    ): { isValid: boolean; calculatedTotal: number; difference: number } {
        const calculatedTotal = parseFloat(
            finalSplits.reduce((sum, split) => sum + split.amountOwed, 0).toFixed(2)
        );
        const difference = Math.abs(calculatedTotal - targetTotal);

        return {
            isValid: difference < tolerance,
            calculatedTotal,
            difference,
        };
    }

    /**
     * Check if expense can be finalized
     */
    static canFinalizeExpense(
        billData: ExtractReceiptDataOutput,
        finalSplits: FinalSplit[],
        payerId?: string
    ): { canFinalize: boolean; reason?: string } {
        if (!payerId) {
            return { canFinalize: false, reason: "Please select who paid the bill." };
        }

        if (billData.discrepancyFlag) {
            return {
                canFinalize: false,
                reason:
                    "Cannot finalize due to bill discrepancy. Please edit item prices to fix the discrepancy.",
            };
        }

        const validation = this.validateFinalSplits(
            finalSplits,
            billData.totalCost
        );
        if (!validation.isValid) {
            return {
                canFinalize: false,
                reason: "Cannot finalize due to calculation mismatch.",
            };
        }

        return { canFinalize: true };
    }
}
