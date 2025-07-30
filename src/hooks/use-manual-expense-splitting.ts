import type { ManualExpenseData } from '@/types';
import { useEffect, useState } from 'react';

interface UseManualExpenseSplittingReturn {
  splitType: 'equal' | 'custom';
  customAmounts: Record<string, number>;
  setSplitType: (type: 'equal' | 'custom') => void;
  handleCustomAmountChange: (memberId: string, value: string) => void;
  validateAndProceed: () => { isValid: boolean; splitType: 'equal' | 'custom'; customAmounts?: Record<string, number> };
}

export function useManualExpenseSplitting(
  expenseData: ManualExpenseData
): UseManualExpenseSplittingReturn {
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Initialize custom amounts with equal split
    const equalAmount = expenseData.amount / expenseData.members.length;
    const initialAmounts: Record<string, number> = {};
    expenseData.members.forEach(member => {
      initialAmounts[member.id] = equalAmount;
    });
    setCustomAmounts(initialAmounts);
  }, [expenseData.amount, expenseData.members]);

  const handleCustomAmountChange = (memberId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCustomAmounts(prev => ({ ...prev, [memberId]: numValue }));
  };

  const validateAndProceed = (): { isValid: boolean; splitType: 'equal' | 'custom'; customAmounts?: Record<string, number> } => {
    if (splitType === 'custom') {
      const totalCustom = Object.values(customAmounts).reduce((sum, val) => sum + val, 0);
      const difference = Math.abs(totalCustom - expenseData.amount);
      
      if (difference > 0.01) {
        return {
          isValid: false,
          splitType: 'custom',
          customAmounts
        };
      }

      // Check for negative or zero amounts
      const invalidAmounts = Object.values(customAmounts).some(amount => amount <= 0);
      if (invalidAmounts) {
        return {
          isValid: false,
          splitType: 'custom',
          customAmounts
        };
      }
    }

    return {
      isValid: true,
      splitType,
      customAmounts: splitType === 'custom' ? customAmounts : undefined
    };
  };

  return {
    splitType,
    customAmounts,
    setSplitType,
    handleCustomAmountChange,
    validateAndProceed
  };
} 