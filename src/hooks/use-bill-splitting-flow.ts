import { useBillSplitting } from '@/contexts/bill-splitting-context';
import type { ExtractReceiptDataOutput, ItemSplit, SplitwiseUser } from '@/types';
import { useCallback } from 'react';

export const useBillSplittingFlow = () => {
  const {
    // State
    expenseType,
    currentStep,
    isLoading,
    isComplete,
    billData,
    updatedBillData,
    itemSplits,
    taxSplit,
    otherChargesSplit,
    receiptId,
    storeName,
    date,
    expenseNotes,
    payerId,
    manualExpenseData,
    customAmounts,
    selectedGroupId,
    selectedMembers,
    
    // Actions
    setExpenseType,
    setCurrentStep,
    setLoading,
    setComplete,
    setBillData,
    setUpdatedBillData,
    setItemSplits,
    setTaxSplit,
    setOtherChargesSplit,
    setReceiptId,
    setManualExpenseData,
    setCustomAmounts,
    setSelectedGroupId,
    setSelectedMembers,
    reset,
    handleEditStep
  } = useBillSplitting();

  // Flow handlers
  const handleExpenseTypeSelect = useCallback((type: 'scan' | 'manual') => {
    setExpenseType(type);
    setCurrentStep(1);
  }, [setExpenseType, setCurrentStep]);

  // Receipt scanning flow handlers
  const handleDataExtracted = useCallback((data: ExtractReceiptDataOutput, receiptId?: string) => {
    setBillData(data);
    // Store receiptId in context for later use
    if (receiptId) {
      setReceiptId(receiptId);
      console.log('Receipt ID captured:', receiptId);
    }
    setCurrentStep(2); // Go to Group Selection step
    setLoading(false);
  }, [setBillData, setReceiptId, setCurrentStep, setLoading]);

  const handleGroupAndMembersSelected = useCallback((groupId: string, members: SplitwiseUser[]) => {
    setSelectedGroupId(groupId);
    const membersWithGroup = members.map(m => ({ 
      ...m, 
      _groupDetails: { id: groupId, name: "Selected Group" } 
    }));
    setSelectedMembers(membersWithGroup);
    
    if (expenseType === 'scan') {
      setCurrentStep(3); // Go to Item Splitting step
    } else if (expenseType === 'manual') {
      setCurrentStep(5);
    }
    setLoading(false);
  }, [expenseType, setSelectedGroupId, setSelectedMembers, setCurrentStep, setLoading]);

  const handleSplitsDefined = useCallback((
    definedItemSplits: ItemSplit[],
    definedTaxSplit: string[],
    definedOtherChargesSplit: string[],
    editedBillData?: ExtractReceiptDataOutput
  ) => {
    setItemSplits(definedItemSplits);
    setTaxSplit(definedTaxSplit);
    setOtherChargesSplit(definedOtherChargesSplit);
    if (editedBillData) {
      setUpdatedBillData(editedBillData);
    }
    setCurrentStep(4); // Go to Review step
    setLoading(false);
  }, [setItemSplits, setTaxSplit, setOtherChargesSplit, setUpdatedBillData, setCurrentStep, setLoading]);

  // Manual expense flow handlers
  const handleSplitConfigured = useCallback((splitType: 'equal' | 'custom', amounts?: Record<string, number>) => {
    if (manualExpenseData) {
      setManualExpenseData({ ...manualExpenseData, splitType });
      setCustomAmounts(amounts);
      setCurrentStep(7);
    }
    setLoading(false);
  }, [manualExpenseData, setManualExpenseData, setCustomAmounts, setCurrentStep, setLoading]);

  const handleFinalize = useCallback((onSuccess?: () => void) => {
    setLoading(true);
    setTimeout(() => {
      setComplete(true);
      setLoading(false);
      // Trigger success callback after a short delay to show completion first
      setTimeout(() => {
        onSuccess?.();
      }, 1000);
    }, 500);
  }, [setLoading, setComplete]);

  const handleRestart = useCallback(() => {
    reset();
  }, [reset]);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setLoading(loading);
  }, [setLoading]);

  // Computed values
  const canProceedToNextStep = useCallback(() => {
    switch (currentStep) {
      case 0: // Type selection
        return expenseType !== null;
      case 1: // Upload or Group selection
        return expenseType === 'scan' ? billData !== null : selectedMembers.length > 0;
      case 2: // Group selection (scan flow)
        return selectedMembers.length > 0;
      case 3: // Item splitting
        return itemSplits.length > 0;
      case 4: // Review (scan flow)
        return true; // Can always proceed to finalize
      case 5: // Manual expense details
        return manualExpenseData !== null;
      case 6: // Manual expense split
        return true; // Can always proceed to review
      case 7: // Manual expense review
        return true; // Can always proceed to finalize
      default:
        return false;
    }
  }, [currentStep, expenseType, billData, selectedMembers, itemSplits, manualExpenseData]);

  const getStepValidation = useCallback(() => {
    const canProceed = canProceedToNextStep();
    const stepNames = {
      0: 'Expense Type Selection',
      1: expenseType === 'scan' ? 'Receipt Upload' : 'Group Selection',
      2: 'Group Selection',
      3: 'Item Splitting',
      4: 'Review & Finalize',
      5: 'Expense Details',
      6: 'Split Configuration',
      7: 'Review & Finalize'
    };

    return {
      canProceed,
      stepName: stepNames[currentStep as keyof typeof stepNames] || 'Unknown Step',
      isLastStep: currentStep === 4 || currentStep === 7
    };
  }, [currentStep, expenseType, canProceedToNextStep]);

  return {
    // State
    expenseType,
    currentStep,
    isLoading,
    isComplete,
    billData,
    updatedBillData,
    itemSplits,
    taxSplit,
    otherChargesSplit,
    receiptId,
    storeName,
    date,
    expenseNotes,
    payerId,
    manualExpenseData,
    customAmounts,
    selectedGroupId,
    selectedMembers,
    
    // Handlers
    handleExpenseTypeSelect,
    handleDataExtracted,
    handleGroupAndMembersSelected,
    handleSplitsDefined,
    handleSplitConfigured,
    handleFinalize,
    handleRestart,
    handleLoadingChange,
    handleEditStep,
    
    // Computed values
    canProceedToNextStep,
    getStepValidation
  };
}; 