import { ExpenseCalculationService } from '@/services/expense-calculations';
import { ExpenseValidationService } from '@/services/expense-validation';
import type { ExtractReceiptDataOutput } from '@/types';
import { useCallback, useState } from 'react';

interface UseBillEditingReturn {
  editedBillData: ExtractReceiptDataOutput;
  editingPrices: Record<number, string>;
  editingTax: string | null;
  editingOtherCharges: string | null;
  hasManualEdits: boolean;
  handleItemPriceChange: (itemIndex: number, newPrice: string) => void;
  handlePriceInputChange: (itemIndex: number, value: string) => void;
  handlePriceInputBlur: (itemIndex: number, value: string) => void;
  handleTaxInputChange: (value: string) => void;
  handleTaxInputBlur: (value: string) => void;
  handleOtherChargesInputChange: (value: string) => void;
  handleOtherChargesInputBlur: (value: string) => void;
  handleKeyPress: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  resetEdits: () => void;
}

export function useBillEditing(
  originalBillData: ExtractReceiptDataOutput
): UseBillEditingReturn {
  const [editedBillData, setEditedBillData] = useState<ExtractReceiptDataOutput>(originalBillData);
  const [editingPrices, setEditingPrices] = useState<Record<number, string>>({});
  const [editingTax, setEditingTax] = useState<string | null>(null);
  const [editingOtherCharges, setEditingOtherCharges] = useState<string | null>(null);
  const [hasManualEdits, setHasManualEdits] = useState(false);

  const updateDiscrepancy = useCallback((updatedData: Partial<ExtractReceiptDataOutput>): ExtractReceiptDataOutput => {
    const discrepancy = ExpenseCalculationService.calculateDiscrepancy(
      updatedData.items || editedBillData.items,
      updatedData.totalCost || editedBillData.totalCost,
      updatedData.taxes ?? undefined,
      updatedData.otherCharges ?? undefined,
      updatedData.discount ?? undefined
    );

    return {
      ...editedBillData,
      ...updatedData,
      discrepancyFlag: discrepancy.flag,
      discrepancyMessage: discrepancy.message
    };
  }, [editedBillData]);

  const handleItemPriceChange = useCallback((itemIndex: number, newPrice: string) => {
    const validation = ExpenseValidationService.validatePriceInput(newPrice);
    if (!validation.isValid) return;

    const priceValue = ExpenseCalculationService.parseCurrencyInput(newPrice);
    if (isNaN(priceValue) || priceValue < 0) return;

    setEditedBillData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], price: priceValue };
      
      return updateDiscrepancy({ ...prev, items: updatedItems });
    });
    
    setHasManualEdits(true);
  }, [updateDiscrepancy]);

  const handlePriceInputChange = useCallback((itemIndex: number, value: string) => {
    // Allow user to type freely, store the string value
    setEditingPrices(prev => ({ ...prev, [itemIndex]: value }));
  }, []);

  const handlePriceInputBlur = useCallback((itemIndex: number, value: string) => {
    // When user finishes editing, validate and update the actual price
    const trimmedValue = value.replace(/[^0-9.]/g, ''); // Remove non-numeric characters except decimal
    const priceValue = parseFloat(trimmedValue);
    
    if (isNaN(priceValue) || priceValue < 0) {
      // Reset to original price if invalid
      setEditingPrices(prev => {
        const newState = { ...prev };
        delete newState[itemIndex];
        return newState;
      });
      return;
    }

    // Update the actual bill data
    setEditedBillData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], price: priceValue };
      
      return updateDiscrepancy({ ...prev, items: updatedItems });
    });
    
    // Clear the editing state
    setEditingPrices(prev => {
      const newState = { ...prev };
      delete newState[itemIndex];
      return newState;
    });
    
    setHasManualEdits(true);
  }, [updateDiscrepancy]);

  const handleTaxInputChange = useCallback((value: string) => {
    setEditingTax(value);
  }, []);

  const handleTaxInputBlur = useCallback((value: string) => {
    const trimmedValue = value.replace(/[^0-9.]/g, '');
    const taxValue = parseFloat(trimmedValue);
    
    if (isNaN(taxValue) || taxValue < 0) {
      setEditingTax(null);
      return;
    }

    setEditedBillData(prev => updateDiscrepancy({ ...prev, taxes: taxValue }));
    
    setEditingTax(null);
    setHasManualEdits(true);
  }, [updateDiscrepancy]);

  const handleOtherChargesInputChange = useCallback((value: string) => {
    setEditingOtherCharges(value);
  }, []);

  const handleOtherChargesInputBlur = useCallback((value: string) => {
    const trimmedValue = value.replace(/[^0-9.]/g, '');
    const chargesValue = parseFloat(trimmedValue);
    
    if (isNaN(chargesValue) || chargesValue < 0) {
      setEditingOtherCharges(null);
      return;
    }

    setEditedBillData(prev => updateDiscrepancy({ ...prev, otherCharges: chargesValue }));
    
    setEditingOtherCharges(null);
    setHasManualEdits(true);
  }, [updateDiscrepancy]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      (event.currentTarget as HTMLInputElement).blur(); // Trigger onBlur
    }
  }, []);

  const resetEdits = useCallback(() => {
    setEditedBillData(originalBillData);
    setEditingPrices({});
    setEditingTax(null);
    setEditingOtherCharges(null);
    setHasManualEdits(false);
  }, [originalBillData]);

  return {
    editedBillData,
    editingPrices,
    editingTax,
    editingOtherCharges,
    hasManualEdits,
    handleItemPriceChange,
    handlePriceInputChange,
    handlePriceInputBlur,
    handleTaxInputChange,
    handleTaxInputBlur,
    handleOtherChargesInputChange,
    handleOtherChargesInputBlur,
    handleKeyPress,
    resetEdits
  };
} 