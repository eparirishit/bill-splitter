"use client";

import type { ExtractReceiptDataOutput, ItemSplit, ManualExpenseData, SplitwiseUser, SplitwiseFriend, SelectionType } from '@/types';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface BillSplittingState {
  // Flow state
  expenseType: 'scan' | 'manual' | null;
  currentStep: number;
  isLoading: boolean;
  isComplete: boolean;
  
  // Receipt scanning flow state
  billData: ExtractReceiptDataOutput | null;
  updatedBillData: ExtractReceiptDataOutput | undefined;
  itemSplits: ItemSplit[];
  taxSplit: string[];
  otherChargesSplit: string[];
  receiptId: string | undefined;
  
  // Review step state
  storeName: string;
  date: string;
  expenseNotes: string;
  payerId: string | undefined;
  
  // Manual expense flow state
  manualExpenseData: ManualExpenseData | null;
  customAmounts: Record<string, number> | undefined;
  splitType: 'equal' | 'custom';
  
  // Manual expense form data (for persistence)
  manualExpenseForm: {
    title: string;
    amount: string;
    notes: string;
    date: string;
  };
  
  // Shared state
  selectedGroupId: string | null;
  selectedMembers: SplitwiseUser[];
  selectionType: SelectionType | null;
  selectedFriends: SplitwiseFriend[];
}

interface BillSplittingContextType extends BillSplittingState {
  // Flow actions
  setExpenseType: (type: 'scan' | 'manual' | null) => void;
  setCurrentStep: (step: number) => void;
  setLoading: (loading: boolean) => void;
  setComplete: (complete: boolean) => void;
  
  // Receipt scanning actions
  setBillData: (data: ExtractReceiptDataOutput) => void;
  setUpdatedBillData: (data: ExtractReceiptDataOutput | undefined) => void;
  setItemSplits: (splits: ItemSplit[]) => void;
  setTaxSplit: (split: string[]) => void;
  setOtherChargesSplit: (split: string[]) => void;
  setReceiptId: (id: string | undefined) => void;
  
  // Review step actions
  setStoreName: (name: string) => void;
  setDate: (date: string) => void;
  setExpenseNotes: (notes: string) => void;
  setPayerId: (id: string | undefined) => void;
  
  // Manual expense actions
  setManualExpenseData: (data: ManualExpenseData | null) => void;
  setCustomAmounts: (amounts: Record<string, number> | undefined) => void;
  setSplitType: (type: 'equal' | 'custom') => void;
  
  // Manual expense form actions
  setManualExpenseFormTitle: (title: string) => void;
  setManualExpenseFormAmount: (amount: string) => void;
  setManualExpenseFormNotes: (notes: string) => void;
  setManualExpenseFormDate: (date: string) => void;
  clearManualExpenseForm: () => void;
  
  // Shared actions
  setSelectedGroupId: (groupId: string | null) => void;
  setSelectedMembers: (members: SplitwiseUser[]) => void;
  setSelectionType: (type: SelectionType | null) => void;
  setSelectedFriends: (friends: SplitwiseFriend[]) => void;
  
  // Utility actions
  reset: () => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  handleEditStep: (step: number) => void;
  
  // Computed values
  canGoToNextStep: boolean;
  canGoToPreviousStep: boolean;
  totalSteps: number;
}

const BillSplittingContext = createContext<BillSplittingContextType | undefined>(undefined);

const initialState: BillSplittingState = {
  expenseType: null,
  currentStep: 0,
  isLoading: false,
  isComplete: false,
  billData: null,
  updatedBillData: undefined,
  itemSplits: [],
  taxSplit: [],
  otherChargesSplit: [],
  receiptId: undefined,
  storeName: '',
  date: '',
  expenseNotes: '',
  payerId: undefined,
  manualExpenseData: null,
  customAmounts: undefined,
  splitType: 'equal', // Added splitType to initial state
  manualExpenseForm: {
    title: '',
    amount: '',
    notes: '',
    date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD format in local timezone
  },
  selectedGroupId: null,
  selectedMembers: [],
  selectionType: null,
  selectedFriends: []
};

// State persistence keys
const STORAGE_KEY = 'bill-splitter-state';

// Helper function to check if localStorage is available
const isLocalStorageAvailable = (): boolean => {
  try {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
};

// Helper function to save state to localStorage
const saveStateToStorage = (state: BillSplittingState) => {
  if (!isLocalStorageAvailable()) return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save state to localStorage:', error);
  }
};

// Helper function to load state from localStorage
const loadStateFromStorage = (): BillSplittingState | null => {
  if (!isLocalStorageAvailable()) return null;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Failed to load state from localStorage:', error);
    return null;
  }
};

export const BillSplittingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<BillSplittingState>(() => {
    // Try to load from localStorage on initialization
    const savedState = loadStateFromStorage();
    return savedState || initialState;
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveStateToStorage(state);
  }, [state]);

  // Flow actions
  const setExpenseType = useCallback((type: 'scan' | 'manual' | null) => {
    setState(prev => ({ 
      ...prev, 
      expenseType: type,
      // Clear form data when starting a new manual expense
      ...(type === 'manual' && {
        manualExpenseForm: {
          title: '',
          amount: '',
          notes: '',
          date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD format in local timezone
        },
        manualExpenseData: null,
        customAmounts: undefined,
        splitType: 'equal',
        payerId: undefined
      })
    }));
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setComplete = useCallback((complete: boolean) => {
    setState(prev => ({ ...prev, isComplete: complete }));
  }, []);

  // Receipt scanning actions
  const setBillData = useCallback((data: ExtractReceiptDataOutput) => {
    setState(prev => ({ ...prev, billData: data }));
  }, []);

  const setUpdatedBillData = useCallback((data: ExtractReceiptDataOutput | undefined) => {
    setState(prev => ({ ...prev, updatedBillData: data }));
  }, []);

  const setItemSplits = useCallback((splits: ItemSplit[]) => {
    setState(prev => ({ ...prev, itemSplits: splits }));
  }, []);

  const setTaxSplit = useCallback((split: string[]) => {
    setState(prev => ({ ...prev, taxSplit: split }));
  }, []);

  const setOtherChargesSplit = useCallback((split: string[]) => {
    setState(prev => ({ ...prev, otherChargesSplit: split }));
  }, []);

  const setReceiptId = useCallback((id: string | undefined) => {
    setState(prev => ({ ...prev, receiptId: id }));
  }, []);

  // Review step actions
  const setStoreName = useCallback((name: string) => {
    setState(prev => ({ ...prev, storeName: name }));
  }, []);

  const setDate = useCallback((date: string) => {
    setState(prev => ({ ...prev, date: date }));
  }, []);

  const setExpenseNotes = useCallback((notes: string) => {
    setState(prev => ({ ...prev, expenseNotes: notes }));
  }, []);

  const setPayerId = useCallback((id: string | undefined) => {
    setState(prev => ({ ...prev, payerId: id }));
  }, []);

  // Manual expense actions
  const setManualExpenseData = useCallback((data: ManualExpenseData | null) => {
    setState(prev => ({ ...prev, manualExpenseData: data }));
  }, []);

  const setCustomAmounts = useCallback((amounts: Record<string, number> | undefined) => {
    setState(prev => ({ ...prev, customAmounts: amounts }));
  }, []);

  const setSplitType = useCallback((type: 'equal' | 'custom') => {
    setState(prev => ({ ...prev, splitType: type }));
  }, []);

  // Manual expense form actions
  const setManualExpenseFormTitle = useCallback((title: string) => {
    setState(prev => ({ 
      ...prev, 
      manualExpenseForm: { ...prev.manualExpenseForm, title } 
    }));
  }, []);

  const setManualExpenseFormAmount = useCallback((amount: string) => {
    setState(prev => ({ 
      ...prev, 
      manualExpenseForm: { ...prev.manualExpenseForm, amount } 
    }));
  }, []);

  const setManualExpenseFormNotes = useCallback((notes: string) => {
    setState(prev => ({ 
      ...prev, 
      manualExpenseForm: { ...prev.manualExpenseForm, notes } 
    }));
  }, []);

  const setManualExpenseFormDate = useCallback((date: string) => {
    setState(prev => ({ 
      ...prev, 
      manualExpenseForm: { ...prev.manualExpenseForm, date } 
    }));
  }, []);

  const clearManualExpenseForm = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      manualExpenseForm: {
        title: '',
        amount: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      }
    }));
  }, []);

  // Shared actions
  const setSelectedGroupId = useCallback((groupId: string | null) => {
    setState(prev => ({ ...prev, selectedGroupId: groupId }));
  }, []);

  const setSelectedMembers = useCallback((members: SplitwiseUser[]) => {
    setState(prev => ({ ...prev, selectedMembers: members }));
  }, []);

  const setSelectionType = useCallback((type: SelectionType | null) => {
    setState(prev => ({ ...prev, selectionType: type }));
  }, []);

  const setSelectedFriends = useCallback((friends: SplitwiseFriend[]) => {
    setState(prev => ({ ...prev, selectedFriends: friends }));
  }, []);

  // Utility actions
  const reset = useCallback(() => {
    setState(initialState);
    // Clear localStorage
    if (isLocalStorageAvailable()) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear localStorage:', error);
      }
    }
  }, []);

  const goToNextStep = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  }, []);

  const goToPreviousStep = useCallback(() => {
    setState(prev => {
      let newStep = prev.currentStep - 1;
      
      // Handle manual flow navigation
      if (prev.expenseType === 'manual') {
        if (prev.currentStep === 5) {
          // From expense details (step 5) go to group selection (step 1)
          newStep = 1;
        } else if (prev.currentStep === 6) {
          // From expense split (step 6) go to expense details (step 5)
          newStep = 5;
        } else if (prev.currentStep === 7) {
          // From expense review (step 7) go to expense split (step 6)
          newStep = 6;
        }
      }
      // Handle scan flow navigation
      else if (prev.expenseType === 'scan') {
        if (prev.currentStep === 2) {
          // From group selection (step 2) go to upload (step 1)
          newStep = 1;
        } else if (prev.currentStep === 3) {
          // From item splitting (step 3) go to group selection (step 2)
          newStep = 2;
        } else if (prev.currentStep === 4) {
          // From review (step 4) go to item splitting (step 3)
          newStep = 3;
        }
      }
      
      return { ...prev, currentStep: Math.max(0, newStep) };
    });
  }, []);

  const handleEditStep = useCallback((step: number) => {
    setState(prev => {
      // Allow going to any valid step (0-7) when not complete
      if (step >= 0 && step <= 7 && !prev.isComplete) {
        return { ...prev, currentStep: step };
      }
      return prev;
    });
  }, []);

  // Computed values
  const canGoToNextStep = state.currentStep < 7; // Maximum step for manual flow
  const canGoToPreviousStep = state.currentStep > 0;
  const totalSteps = state.expenseType === 'scan' ? 4 : state.expenseType === 'manual' ? 3 : 0;

  const contextValue: BillSplittingContextType = {
    ...state,
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
    setStoreName,
    setDate,
    setExpenseNotes,
    setPayerId,
    setManualExpenseData,
    setCustomAmounts,
    setSplitType,
    setManualExpenseFormTitle,
    setManualExpenseFormAmount,
    setManualExpenseFormNotes,
    setManualExpenseFormDate,
    clearManualExpenseForm,
    setSelectedGroupId,
    setSelectedMembers,
    setSelectionType,
    setSelectedFriends,
    reset,
    goToNextStep,
    goToPreviousStep,
    handleEditStep,
    canGoToNextStep,
    canGoToPreviousStep,
    totalSteps
  };

  return (
    <BillSplittingContext.Provider value={contextValue}>
      {children}
    </BillSplittingContext.Provider>
  );
};

export const useBillSplitting = () => {
  const context = useContext(BillSplittingContext);
  if (context === undefined) {
    throw new Error('useBillSplitting must be used within a BillSplittingProvider');
  }
  return context;
}; 