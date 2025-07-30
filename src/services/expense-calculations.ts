import type { ExtractReceiptDataOutput, FinalSplit, ItemSplit, SplitwiseUser } from "@/types";

export interface ExpenseCalculationResult {
  itemSplits: ItemSplit[];
  taxSplit: string[];
  otherChargesSplit: string[];
  totalAllocated: number;
  totalCost: number;
  isValid: boolean;
}

export interface PriceCalculationResult {
  equalSplitAmount: number;
  customAmounts: Record<string, number>;
  totalAllocated: number;
}

export class ExpenseCalculationService {
  static calculateEqualSplit(price: number, memberIds: string[]): PriceCalculationResult {
    if (memberIds.length === 0) {
      return {
        equalSplitAmount: 0,
        customAmounts: {},
        totalAllocated: 0
      };
    }

    const equalSplitAmount = price / memberIds.length;
    const customAmounts: Record<string, number> = {};
    
    memberIds.forEach(memberId => {
      customAmounts[memberId] = equalSplitAmount;
    });

    return {
      equalSplitAmount,
      customAmounts,
      totalAllocated: price
    };
  }

  static calculateCustomSplit(price: number, customAmounts: Record<string, number>): PriceCalculationResult {
    const totalAllocated = Object.values(customAmounts).reduce((sum, amount) => sum + amount, 0);
    const equalSplitAmount = totalAllocated / Object.keys(customAmounts).length;

    return {
      equalSplitAmount,
      customAmounts,
      totalAllocated
    };
  }

  static formatCurrency(amount: number | undefined | null): string {
    if (amount === undefined || amount === null) {
      return '$0.00';
    }
    
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);
  }

  static parseCurrencyInput(value: string): number {
    // Remove currency symbols and commas
    const cleanValue = value.replace(/[$,]/g, '');
    const num = parseFloat(cleanValue);
    return isNaN(num) ? 0 : num;
  }

  static validateAndCalculateSplits(
    billData: ExtractReceiptDataOutput,
    itemSplits: ItemSplit[],
    taxSplit: string[],
    otherChargesSplit: string[]
  ): ExpenseCalculationResult {
    const totalCost = billData.totalCost;
    let totalAllocated = 0;

    // Calculate total allocated from items
    itemSplits.forEach(split => {
      if (split.splitType === 'equal') {
        // For equal splits, we need to get the price from the original bill data
        // This is a limitation of the current design - we should pass the original items
        totalAllocated += 0; // This will be calculated differently
      } else {
        totalAllocated += Object.values(split.customAmounts || {}).reduce((sum, amount) => sum + amount, 0);
      }
    });

    // Add taxes and other charges if they exist
    if (billData.taxes && taxSplit.length > 0) {
      totalAllocated += billData.taxes;
    }
    if (billData.otherCharges && otherChargesSplit.length > 0) {
      totalAllocated += billData.otherCharges;
    }

    const isValid = Math.abs(totalAllocated - totalCost) <= 0.01; // Allow for small rounding differences

    return {
      itemSplits,
      taxSplit,
      otherChargesSplit,
      totalAllocated,
      totalCost,
      isValid
    };
  }

  static distributeRemainingAmount(
    remainingAmount: number,
    memberIds: string[],
    currentAllocations: Record<string, number>
  ): Record<string, number> {
    if (memberIds.length === 0 || remainingAmount <= 0) {
      return currentAllocations;
    }

    const equalShare = remainingAmount / memberIds.length;
    const newAllocations = { ...currentAllocations };

    memberIds.forEach(memberId => {
      newAllocations[memberId] = (newAllocations[memberId] || 0) + equalShare;
    });

    return newAllocations;
  }

  static calculateDiscrepancy(
    items: any[],
    totalCost: number,
    taxes?: number,
    otherCharges?: number,
    discount?: number
  ): { flag: boolean; message?: string; calculatedTotal: number; difference: number } {
    const itemsSum = items.reduce((sum, item) => sum + item.price, 0);
    const taxesAmount = taxes ?? 0;
    const otherChargesAmount = otherCharges ?? 0;
    const discountAmount = discount ?? 0;
    const calculatedTotal = itemsSum + taxesAmount + otherChargesAmount - discountAmount;
    const difference = Math.abs(calculatedTotal - totalCost);
    
    const flag = difference > 0.02;
    const message = flag 
      ? `Receipt total ($${totalCost.toFixed(2)}) differs from calculated total ($${calculatedTotal.toFixed(2)}) by $${difference.toFixed(2)}. This may indicate missing items, fees, or rounding differences.`
      : undefined;

    return {
      flag,
      message,
      calculatedTotal,
      difference
    };
  }

  static calculateEqualSplitWithCents(
    totalAmount: number,
    memberCount: number
  ): number[] {
    const totalCents = Math.round(totalAmount * 100);
    const baseCents = Math.floor(totalCents / memberCount);
    const remainderCents = totalCents % memberCount;
    
    const amounts: number[] = [];
    for (let i = 0; i < memberCount; i++) {
      const extraCent = i < remainderCents ? 1 : 0;
      amounts.push((baseCents + extraCent) / 100);
    }
    
    return amounts;
  }

  static calculateFinalSplits(
    billData: ExtractReceiptDataOutput,
    itemSplits: ItemSplit[],
    selectedMembers: SplitwiseUser[],
    taxSplitMembers: string[],
    otherChargesSplitMembers: string[]
  ): FinalSplit[] {
    const memberGrossTotals: Record<string, number> = selectedMembers.reduce((acc, member) => {
      acc[member.id] = 0;
      return acc;
    }, {} as Record<string, number>);

    // Calculate gross share for each member
    billData.items.forEach((item, index) => {
      const itemId = `item-${index}`;
      const splitInfo = itemSplits.find(s => s.itemId === itemId);
      if (!splitInfo || splitInfo.sharedBy.length === 0) return;
      
      const costPerMember = item.price / splitInfo.sharedBy.length;
      splitInfo.sharedBy.forEach(memberId => {
        if (memberGrossTotals[memberId] !== undefined) {
          memberGrossTotals[memberId] += costPerMember;
        }
      });
    });

    // Add taxes and other charges
    if ((billData.taxes ?? 0) > 0 && taxSplitMembers.length > 0) {
      const taxPerMember = (billData.taxes ?? 0) / taxSplitMembers.length;
      taxSplitMembers.forEach(memberId => {
        if (memberGrossTotals[memberId] !== undefined) {
          memberGrossTotals[memberId] += taxPerMember;
        }
      });
    }

    if ((billData.otherCharges ?? 0) > 0 && otherChargesSplitMembers.length > 0) {
      const chargePerMember = (billData.otherCharges ?? 0) / otherChargesSplitMembers.length;
      otherChargesSplitMembers.forEach(memberId => {
        if (memberGrossTotals[memberId] !== undefined) {
          memberGrossTotals[memberId] += chargePerMember;
        }
      });
    }

    const overallGrossTotal = Object.values(memberGrossTotals).reduce((sum, val) => sum + val, 0);
    const targetTotal = billData.totalCost;
    let finalMemberShares: Record<string, number> = {};

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
    let roundedMemberShares: Record<string, number> = {};
    let sumOfRoundedShares = 0;
    selectedMembers.forEach(member => {
      const roundedShare = Math.round((finalMemberShares[member.id] ?? 0) * 100) / 100;
      roundedMemberShares[member.id] = roundedShare;
      sumOfRoundedShares += roundedShare;
    });

    let discrepancy = parseFloat((targetTotal - sumOfRoundedShares).toFixed(2));
    
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
      amountOwed: roundedMemberShares[member.id] !== undefined ? roundedMemberShares[member.id] : 0,
    }));
  }
} 