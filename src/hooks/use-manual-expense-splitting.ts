import type { ManualExpenseData } from '@/types';
import { useEffect, useRef, useState } from 'react';

interface UseManualExpenseSplittingReturn {
  splitType: 'equal' | 'custom';
  customAmounts: Record<string, number>;
  getInputValue: (memberId: string) => string;
  setSplitType: (type: 'equal' | 'custom') => void;
  handleCustomAmountChange: (memberId: string, value: string, inputElement?: HTMLInputElement) => void;
  validateAndProceed: () => { isValid: boolean; splitType: 'equal' | 'custom'; customAmounts?: Record<string, number> };
}

export function useManualExpenseSplitting(
  expenseData: ManualExpenseData
): UseManualExpenseSplittingReturn {
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  const inputValuesRef = useRef<Record<string, string>>({});
  const [, setRenderTrigger] = useState(0);

  useEffect(() => {
    // Initialize custom amounts with equal split
    const equalAmount = expenseData.amount / expenseData.members.length;
    const initialAmounts: Record<string, number> = {};
    expenseData.members.forEach(member => {
      initialAmounts[member.id] = equalAmount;
      inputValuesRef.current[member.id] = equalAmount.toString();
    });
    setCustomAmounts(initialAmounts);
  }, [expenseData.amount, expenseData.members]);

  const handleCustomAmountChange = (memberId: string, value: string, inputElement?: HTMLInputElement) => {
    const cursorPosition = inputElement?.selectionStart ?? null;
    // Remove any non-numeric characters except decimal point
    let cleanValue = value.replace(/[^0-9.]/g, '');
    
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      const firstDecimalIndex = cleanValue.indexOf('.');
      cleanValue = cleanValue.substring(0, firstDecimalIndex + 1) + cleanValue.substring(firstDecimalIndex + 1).replace(/\./g, '');
    }
    inputValuesRef.current[memberId] = cleanValue;
    setRenderTrigger(prev => prev + 1);
    
    if (cleanValue === '' || cleanValue === '.') {
      setCustomAmounts(prev => ({ ...prev, [memberId]: 0 }));
      if (inputElement && cursorPosition !== null) {
        setTimeout(() => {
          inputElement.setSelectionRange(cursorPosition, cursorPosition);
        }, 0);
      }
      return;
    }
    
    const numValue = parseFloat(cleanValue);
    
    if (!isNaN(numValue) && numValue >= 0) {
      setCustomAmounts(prev => ({ ...prev, [memberId]: numValue }));
    } else if (cleanValue === '0.' || cleanValue.startsWith('0.') || cleanValue === '0') {
      setCustomAmounts(prev => ({ ...prev, [memberId]: 0 }));
    }

    if (inputElement && cursorPosition !== null) {
      setTimeout(() => {
        const newPosition = Math.min(cursorPosition, cleanValue.length);
        inputElement.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
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

  const getInputValue = (memberId: string): string => {
    return inputValuesRef.current[memberId] ?? (customAmounts[memberId]?.toString() ?? '');
  };

  return {
    splitType,
    customAmounts,
    getInputValue,
    setSplitType,
    handleCustomAmountChange,
    validateAndProceed
  };
}
