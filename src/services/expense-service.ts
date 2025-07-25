import type {
    ExtractReceiptDataOutput,
    SplitwiseUser,
    ItemSplit,
    FinalSplit,
    CreateExpense,
    ManualExpenseData
} from '@/types';
import { createExpense } from '@/services/splitwise';
import { isAPIError, getErrorMessage, isSuccessfulResponse } from '@/types/api';
import { NotesService } from '@/services/notes-service';

export class ExpenseService {
    /**
     * Calculate final splits for scanned receipt expenses
     */
    static calculateReceiptSplits(
        billData: ExtractReceiptDataOutput,
        selectedMembers: SplitwiseUser[],
        itemSplits: ItemSplit[],
        taxSplitMembers: string[],
        otherChargesSplitMembers: string[]
    ): FinalSplit[] {
        const memberGrossTotals: Record<string, number> = selectedMembers.reduce((acc, member) => {
            acc[member.id] = 0;
            return acc;
        }, {} as Record<string, number>);

        // Calculate gross share for each member from items
        billData.items.forEach((item, index) => {
            const itemId = `item-${index}`;
            const splitInfo = itemSplits.find(s => s.itemId === itemId);
            if (!splitInfo || splitInfo.sharedBy.length === 0) {return;}

            const costPerMember = item.price / splitInfo.sharedBy.length;
            splitInfo.sharedBy.forEach(memberId => {
                if (memberGrossTotals[memberId] !== undefined) {
                    memberGrossTotals[memberId] += costPerMember;
                }
            });
        });

        // Add tax splits
        if ((billData.taxes ?? 0) > 0 && taxSplitMembers.length > 0) {
            const taxPerMember = (billData.taxes ?? 0) / taxSplitMembers.length;
            taxSplitMembers.forEach(memberId => {
                if (memberGrossTotals[memberId] !== undefined) {
                    memberGrossTotals[memberId] += taxPerMember;
                }
            });
        }

        // Add other charges splits
        if ((billData.otherCharges ?? 0) > 0 && otherChargesSplitMembers.length > 0) {
            const chargePerMember = (billData.otherCharges ?? 0) / otherChargesSplitMembers.length;
            otherChargesSplitMembers.forEach(memberId => {
                if (memberGrossTotals[memberId] !== undefined) {
                    memberGrossTotals[memberId] += chargePerMember;
                }
            });
        }

        return this.distributeAmountWithPennyCorrection(
            memberGrossTotals,
            selectedMembers,
            billData.totalCost
        );
    }

    /**
     * Calculate final splits for manual expenses
     */
    static calculateManualSplits(
        expenseData: ManualExpenseData,
        customAmounts?: Record<string, number>
    ): FinalSplit[] {
        if (expenseData.splitType === 'custom' && customAmounts) {
            // For custom splits, use provided amounts with penny correction
            const memberAmounts: Record<string, number> = {};
            expenseData.members.forEach(member => {
                memberAmounts[member.id] = customAmounts[member.id] || 0;
            });

            return this.distributeAmountWithPennyCorrection(
                memberAmounts,
                expenseData.members,
                expenseData.amount
            );
        }

        // For equal splits, calculate base amounts
        const memberAmounts: Record<string, number> = {};
        expenseData.members.forEach(member => {
            memberAmounts[member.id] = expenseData.amount / expenseData.members.length;
        });

        return this.distributeAmountWithPennyCorrection(
            memberAmounts,
            expenseData.members,
            expenseData.amount
        );
    }

    /**
     * Distribute amounts with penny-perfect correction
     */
    private static distributeAmountWithPennyCorrection(
        memberGrossTotals: Record<string, number>,
        selectedMembers: SplitwiseUser[],
        targetTotal: number
    ): FinalSplit[] {
        const overallGrossTotal = Object.values(memberGrossTotals).reduce((sum, val) => sum + val, 0);
        const finalMemberShares: Record<string, number> = {};

        if (overallGrossTotal === 0) {
            if (targetTotal !== 0 && selectedMembers.length > 0) {
                const amountPerMember = targetTotal / selectedMembers.length;
                selectedMembers.forEach(member => {
                    finalMemberShares[member.id] = amountPerMember;
                });
            } else {
                selectedMembers.forEach(member => {
                    finalMemberShares[member.id] = 0;
                });
            }
        } else {
            selectedMembers.forEach(member => {
                const proportion = (memberGrossTotals[member.id] ?? 0) / overallGrossTotal;
                finalMemberShares[member.id] = proportion * targetTotal;
            });
        }

        // Round shares and distribute pennies
        const roundedMemberShares: Record<string, number> = {};
        let sumOfRoundedShares = 0;

        selectedMembers.forEach(member => {
            const roundedShare = Math.round((finalMemberShares[member.id] ?? 0) * 100) / 100;
            roundedMemberShares[member.id] = roundedShare;
            sumOfRoundedShares += roundedShare;
        });

        const discrepancy = parseFloat((targetTotal - sumOfRoundedShares).toFixed(2));

        if (Math.abs(discrepancy) > 0.005 && selectedMembers.length > 0) {
            const memberIdsToAdjust = selectedMembers
                .map(m => m.id)
                .sort((a, b) => (roundedMemberShares[b] ?? 0) - (roundedMemberShares[a] ?? 0));

            let remainingDiscrepancyCents = Math.round(discrepancy * 100);
            let i = 0;

            while (remainingDiscrepancyCents !== 0 && i < memberIdsToAdjust.length * 2) {
                const memberId = memberIdsToAdjust[i % memberIdsToAdjust.length];
                const adjustment = remainingDiscrepancyCents > 0 ? 0.01 : -0.01;
                roundedMemberShares[memberId] = parseFloat(((roundedMemberShares[memberId] ?? 0) + adjustment).toFixed(2));
                remainingDiscrepancyCents -= Math.round(adjustment * 100);
                i++;
            }

            if (remainingDiscrepancyCents !== 0 && memberIdsToAdjust.length > 0) {
                const firstMemberId = memberIdsToAdjust[0];
                roundedMemberShares[firstMemberId] = parseFloat(((roundedMemberShares[firstMemberId] ?? 0) + (remainingDiscrepancyCents / 100)).toFixed(2));
            }
        }

        return selectedMembers.map(member => ({
            userId: member.id,
            amountOwed: roundedMemberShares[member.id] ?? 0,
        }));
    }

    /**
     * Create expense payload for Splitwise API
     */
    static createExpensePayload(
        billData: ExtractReceiptDataOutput,
        finalSplits: FinalSplit[],
        payerId: string,
        storeName: string,
        date: string,
        notes: string
    ): CreateExpense {
        const groupIdStr = finalSplits[0] ? finalSplits.find(s => s.userId === payerId)?.userId : null;
        if (!groupIdStr) {throw new Error("Group ID not found");}

        const groupId = parseInt(groupIdStr);
        const numericPayerId = parseInt(payerId);
        const totalCost = billData.totalCost;

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
            group_id: groupId,
            date: NotesService.formatToLocalDateString(date),
            details: notes,
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

    /**
     * Create manual expense payload for Splitwise API
     */
    static createManualExpensePayload(
        expenseData: ManualExpenseData,
        finalSplits: FinalSplit[],
        payerId: string
    ): CreateExpense {
        const groupId = parseInt(expenseData.groupId);
        const numericPayerId = parseInt(payerId);

        const expensePayload: CreateExpense = {
            cost: expenseData.amount.toFixed(2),
            description: expenseData.title,
            group_id: groupId,
            date: expenseData.date,
            currency_code: 'USD',
            category_id: 18,
            split_equally: expenseData.splitType === 'equal',
            details: expenseData.notes || undefined,
        };

        finalSplits.forEach((split, index) => {
            const paidShare = parseInt(split.userId) === numericPayerId ? expenseData.amount.toFixed(2) : '0.00';
            const owedShare = split.amountOwed.toFixed(2);

            expensePayload[`users__${index}__user_id`] = parseInt(split.userId);
            expensePayload[`users__${index}__paid_share`] = paidShare;
            expensePayload[`users__${index}__owed_share`] = owedShare;
        });

        return expensePayload;
    }

    /**
     * Submit expense to Splitwise with error handling
     */
    static async submitExpense(expensePayload: CreateExpense): Promise<void> {
        const result = await createExpense(expensePayload);

        // Check for API errors using improved error handling
        if (isAPIError(result)) {
            const errorMessage = getErrorMessage(result);
            throw new Error(errorMessage);
        }

        // Check if the response indicates success
        if (!isSuccessfulResponse(result)) {
            console.warn("Unexpected API response:", result);
            // Don't throw an error if we can't determine success/failure
            // Let it continue to success handling
        }
    }

    /**
     * Format date string to YYYY-MM-DD
     */
    private static formatToLocalDateString(dateInput: string | Date): string {
        return NotesService.formatToLocalDateString(dateInput);
    }
}
