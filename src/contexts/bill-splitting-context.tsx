"use client";

import type { ExtractReceiptDataOutput, ItemSplit, SplitwiseUser } from '@/types';
import React, { createContext, useCallback, useContext, useState } from 'react';

interface BillSplittingState {
  billData: ExtractReceiptDataOutput | null;
  selectedMembers: SplitwiseUser[];
  itemSplits: ItemSplit[];
  taxSplit: string[];
  otherChargesSplit: string[];
  currentStep: number;
  isLoading: boolean;
}

interface BillSplittingContextType extends BillSplittingState {
  setBillData: (data: ExtractReceiptDataOutput) => void;
  setSelectedMembers: (members: SplitwiseUser[]) => void;
  setItemSplits: (splits: ItemSplit[]) => void;
  setTaxSplit: (split: string[]) => void;
  setOtherChargesSplit: (split: string[]) => void;
  setCurrentStep: (step: number) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

const BillSplittingContext = createContext<BillSplittingContextType | undefined>(undefined);

const initialState: BillSplittingState = {
  billData: null,
  selectedMembers: [],
  itemSplits: [],
  taxSplit: [],
  otherChargesSplit: [],
  currentStep: 0,
  isLoading: false
};

export const BillSplittingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<BillSplittingState>(initialState);

  const setBillData = useCallback((data: ExtractReceiptDataOutput) => {
    setState(prev => ({ ...prev, billData: data }));
  }, []);

  const setSelectedMembers = useCallback((members: SplitwiseUser[]) => {
    setState(prev => ({ ...prev, selectedMembers: members }));
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

  const setCurrentStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const goToNextStep = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  }, []);

  const goToPreviousStep = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }));
  }, []);

  const contextValue: BillSplittingContextType = {
    ...state,
    setBillData,
    setSelectedMembers,
    setItemSplits,
    setTaxSplit,
    setOtherChargesSplit,
    setCurrentStep,
    setLoading,
    reset,
    goToNextStep,
    goToPreviousStep
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