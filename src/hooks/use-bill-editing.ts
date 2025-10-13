import { ExpenseCalculationService } from '@/services/expense-calculations';
import { ExpenseValidationService } from '@/services/expense-validation';
import type { ExtractReceiptDataOutput } from '@/types';
import { useCallback, useState } from 'react';

interface UseBillEditingReturn {
  editedBillData: ExtractReceiptDataOutput;
  editingPrices: Record<number, string>;
  editingNames: Record<number, string>;
  editingTax: string | null;
  editingOtherCharges: string | null;
  editingDiscount: string | null;
  editingTotalCost: string | null;
  hasManualEdits: boolean;
  handleItemPriceChange: (itemIndex: number, newPrice: string) => void;
  handlePriceInputChange: (itemIndex: number, value: string) => void;
  handlePriceInputBlur: (itemIndex: number, value: string) => void;
  handleItemNameChange: (itemIndex: number, newName: string) => void;
  handleNameInputChange: (itemIndex: number, value: string) => void;
  handleNameInputBlur: (itemIndex: number, value: string) => void;
  handleTaxInputChange: (value: string) => void;
  handleTaxInputBlur: (value: string) => void;
  handleOtherChargesInputChange: (value: string) => void;
  handleOtherChargesInputBlur: (value: string) => void;
  handleDiscountInputChange: (value: string) => void;
  handleDiscountInputBlur: (value: string) => void;
  handleTotalCostInputChange: (value: string) => void;
  handleTotalCostInputBlur: (value: string) => void;
  handleKeyPress: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleAddItem: (name: string, price: number) => void;
  handleRemoveItem: (itemIndex: number) => void;
  resetEdits: () => void;
}

export function useBillEditing(
  originalBillData: ExtractReceiptDataOutput
): UseBillEditingReturn {
  const [editedBillData, setEditedBillData] = useState<ExtractReceiptDataOutput>(originalBillData);
  const [editingPrices, setEditingPrices] = useState<Record<number, string>>({});
  const [editingNames, setEditingNames] = useState<Record<number, string>>({});
  const [editingTax, setEditingTax] = useState<string | null>(null);
  const [editingOtherCharges, setEditingOtherCharges] = useState<string | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<string | null>(null);
  const [editingTotalCost, setEditingTotalCost] = useState<string | null>(null);
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

  const handleItemNameChange = useCallback((itemIndex: number, newName: string) => {
    const trimmedName = newName.trim();
    if (trimmedName.length === 0) return;

    setEditedBillData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], name: trimmedName };
      
      return updateDiscrepancy({ ...prev, items: updatedItems });
    });
    
    setHasManualEdits(true);
  }, [updateDiscrepancy]);

  const handleNameInputChange = useCallback((itemIndex: number, value: string) => {
    // Allow user to type freely, store the string value
    setEditingNames(prev => ({ ...prev, [itemIndex]: value }));
  }, []);

  const handleNameInputBlur = useCallback((itemIndex: number, value: string) => {
    const trimmedName = value.trim();
    
    if (trimmedName.length === 0) {
      // Reset to original name if invalid
      setEditingNames(prev => {
        const newState = { ...prev };
        delete newState[itemIndex];
        return newState;
      });
      return;
    }

    // Update the actual bill data
    setEditedBillData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], name: trimmedName };
      
      return updateDiscrepancy({ ...prev, items: updatedItems });
    });
    
    // Clear the editing state
    setEditingNames(prev => {
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

  const handleTotalCostInputChange = useCallback((value: string) => {
    setEditingTotalCost(value);
  }, []);

  const handleTotalCostInputBlur = useCallback((value: string) => {
    const trimmedValue = value.replace(/[^0-9.]/g, '');
    const totalCostValue = parseFloat(trimmedValue);
    
    if (isNaN(totalCostValue) || totalCostValue < 0) {
      setEditingTotalCost(null);
      return;
    }

    setEditedBillData(prev => updateDiscrepancy({ ...prev, totalCost: totalCostValue }));
    
    setEditingTotalCost(null);
    setHasManualEdits(true);
  }, [updateDiscrepancy]);

  const handleDiscountInputChange = useCallback((value: string) => {
    setEditingDiscount(value);
  }, []);

  const handleDiscountInputBlur = useCallback((value: string) => {
    const trimmedValue = value.replace(/[^0-9.]/g, '');
    const discountValue = parseFloat(trimmedValue);
    
    if (isNaN(discountValue) || discountValue < 0) {
      setEditingDiscount(null);
      return;
    }

    setEditedBillData(prev => updateDiscrepancy({ ...prev, discount: discountValue }));
    
    setEditingDiscount(null);
    setHasManualEdits(true);
  }, [updateDiscrepancy]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      (event.currentTarget as HTMLInputElement).blur(); // Trigger onBlur
    }
  }, []);

  const handleAddItem = useCallback((name: string, price: number) => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0 || price < 0) return;

    setEditedBillData(prev => {
      const newItem = { name: trimmedName, price };
      const updatedItems = [...prev.items, newItem];
      
      return updateDiscrepancy({ ...prev, items: updatedItems });
    });
    
    setHasManualEdits(true);
  }, [updateDiscrepancy]);

  const handleRemoveItem = useCallback((itemIndex: number) => {
    if (itemIndex < 0 || itemIndex >= editedBillData.items.length) return;
    
    setEditedBillData(prev => {
      const updatedItems = prev.items.filter((_, index) => index !== itemIndex);
      
      return updateDiscrepancy({ ...prev, items: updatedItems });
    });
    
    setHasManualEdits(true);
  }, [editedBillData.items.length, updateDiscrepancy]);

  const resetEdits = useCallback(() => {
    setEditedBillData(originalBillData);
    setEditingPrices({});
    setEditingNames({});
    setEditingTax(null);
    setEditingOtherCharges(null);
    setEditingDiscount(null);
    setEditingTotalCost(null);
    setHasManualEdits(false);
  }, [originalBillData]);

  return {
    editedBillData,
    editingPrices,
    editingNames,
    editingTax,
    editingOtherCharges,
    editingDiscount,
    editingTotalCost,
    hasManualEdits,
    handleItemPriceChange,
    handlePriceInputChange,
    handlePriceInputBlur,
    handleItemNameChange,
    handleNameInputChange,
    handleNameInputBlur,
    handleTaxInputChange,
    handleTaxInputBlur,
    handleOtherChargesInputChange,
    handleOtherChargesInputBlur,
    handleDiscountInputChange,
    handleDiscountInputBlur,
    handleTotalCostInputChange,
    handleTotalCostInputBlur,
    handleKeyPress,
    handleAddItem,
    handleRemoveItem,
    resetEdits
  };
} 