"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ExpenseTypeSelection } from "@/components/bill-splitter/common/expense-type-selection";
import { UploadStep } from "@/components/bill-splitter/scan/upload-step";
import { GroupSelectionStep } from "@/components/bill-splitter/common/group-selection-step";
import { ItemSplittingStep } from "@/components/bill-splitter/scan/item-splitting-step";
import { ReviewStep } from "@/components/bill-splitter/scan/review-step";
import { ManualExpenseDetailsStep } from "@/components/bill-splitter/manual/expense-details-step";
import { ManualExpenseSplitStep } from "@/components/bill-splitter/manual/expense-split-step";
import { ManualExpenseReviewStep } from "@/components/bill-splitter/manual/expense-review-step";
import { CheckCircle, Loader2 } from "lucide-react";
import type { ExtractReceiptDataOutput, SplitwiseUser, ItemSplit, ManualExpenseData } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ExpenseType = 'scan' | 'manual' | null;

function BillSplitterFlow() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [expenseType, setExpenseType] = React.useState<ExpenseType>(null);
  const [currentStep, setCurrentStep] = React.useState(0); // 0 = type selection
  const [isLoading, setIsLoading] = React.useState(false);
  
  // Receipt scanning flow state
  const [billData, setBillData] = React.useState<ExtractReceiptDataOutput | null>(null);
  const [itemSplits, setItemSplits] = React.useState<ItemSplit[]>([]);
  const [taxSplitMembers, setTaxSplitMembers] = React.useState<string[]>([]);
  const [otherChargesSplitMembers, setOtherChargesSplitMembers] = React.useState<string[]>([]);
  
  // Manual expense flow state
  const [manualExpenseData, setManualExpenseData] = React.useState<ManualExpenseData | null>(null);
  const [customAmounts, setCustomAmounts] = React.useState<Record<string, number> | undefined>(undefined);
  
  // Shared state
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = React.useState<SplitwiseUser[]>([]);
  const [isComplete, setIsComplete] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const handleExpenseTypeSelect = (type: 'scan' | 'manual') => {
    setExpenseType(type);
    setCurrentStep(1);
  };

  // Receipt scanning flow handlers
  const handleDataExtracted = (data: ExtractReceiptDataOutput) => {
    setBillData(data);
    setCurrentStep(2);
    setIsLoading(false);
  };

  const handleGroupAndMembersSelected = (groupId: string, members: SplitwiseUser[]) => {
    setSelectedGroupId(groupId);
    const membersWithGroup = members.map(m => ({ ...m, _groupDetails: { id: groupId, name: "Selected Group" } }));
    setSelectedMembers(membersWithGroup);
    
    if (expenseType === 'scan') {
      setCurrentStep(3);
    } else if (expenseType === 'manual') {
      setCurrentStep(5);
    }
    setIsLoading(false);
  };

  const handleSplitsDefined = (
    definedItemSplits: ItemSplit[],
    definedTaxSplit: string[],
    definedOtherChargesSplit: string[]
  ) => {
    setItemSplits(definedItemSplits);
    setTaxSplitMembers(definedTaxSplit);
    setOtherChargesSplitMembers(definedOtherChargesSplit);
    setCurrentStep(4);
    setIsLoading(false);
  };

  // Manual expense flow handlers
  const handleExpenseDetailsSet = (expenseData: ManualExpenseData) => {
    setManualExpenseData(expenseData);
    setCurrentStep(6);
    setIsLoading(false);
  };

  const handleSplitConfigured = (splitType: 'equal' | 'custom', amounts?: Record<string, number>) => {
    if (manualExpenseData) {
      setManualExpenseData(prev => prev ? { ...prev, splitType } : null);
      setCustomAmounts(amounts);
      setCurrentStep(7);
    }
    setIsLoading(false);
  };

  const handleEditStep = (step: number) => {
    if (step >= 0 && step < currentStep && !isComplete) {
      setCurrentStep(step);
    }
  };

  const handleFinalize = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsComplete(true);
      setIsLoading(false);
    }, 500);
  };

  const handleRestart = () => {
    setExpenseType(null);
    setCurrentStep(0);
    setIsLoading(false);
    setBillData(null);
    setSelectedGroupId(null);
    setSelectedMembers([]);
    setItemSplits([]);
    setTaxSplitMembers([]);
    setOtherChargesSplitMembers([]);
    setManualExpenseData(null);
    setCustomAmounts(undefined);
    setIsComplete(false);
  };

  const handleLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
  };

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100dvh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <ExpenseTypeSelection onTypeSelect={handleExpenseTypeSelect} />;
      
      case 1:
        if (expenseType === 'scan') {
          return (
            <UploadStep 
              onDataExtracted={handleDataExtracted} 
              onLoadingChange={handleLoadingChange} 
              isLoading={isLoading}
              onBack={() => handleEditStep(0)}
            />
          );
        } else if (expenseType === 'manual') {
          return (
            <GroupSelectionStep 
              onGroupAndMembersSelected={handleGroupAndMembersSelected} 
              onLoadingChange={handleLoadingChange} 
              isLoading={isLoading} 
              onBack={() => handleEditStep(0)} 
            />
          );
        }
        break;
        
      case 2:
        return expenseType === 'scan' && billData && (
          <GroupSelectionStep 
            onGroupAndMembersSelected={handleGroupAndMembersSelected} 
            onLoadingChange={handleLoadingChange} 
            isLoading={isLoading} 
            onBack={() => handleEditStep(1)} 
          />
        );
        
      case 3:
        return expenseType === 'scan' && billData && selectedMembers.length > 0 && (
          <ItemSplittingStep
            billData={billData}
            selectedMembers={selectedMembers}
            onSplitsDefined={handleSplitsDefined}
            onLoadingChange={handleLoadingChange}
            isLoading={isLoading}
            onBack={() => handleEditStep(2)}
          />
        );
        
      case 4:
        return expenseType === 'scan' && billData && selectedMembers.length > 0 && itemSplits.length > 0 && (
          <ReviewStep
            billData={billData}
            selectedMembers={selectedMembers}
            itemSplits={itemSplits}
            taxSplitMembers={taxSplitMembers}
            otherChargesSplitMembers={otherChargesSplitMembers}
            onFinalize={handleFinalize}
            onEdit={handleEditStep}
            onLoadingChange={handleLoadingChange}
            isLoading={isLoading}
          />
        );
        
      case 5:
        return expenseType === 'manual' && selectedMembers.length > 0 && selectedGroupId && (
          <ManualExpenseDetailsStep
            selectedMembers={selectedMembers}
            onExpenseDetailsSet={handleExpenseDetailsSet}
            onBack={() => handleEditStep(1)}
            groupId={selectedGroupId}
          />
        );
        
      case 6:
        return expenseType === 'manual' && manualExpenseData && (
          <ManualExpenseSplitStep
            expenseData={manualExpenseData}
            onSplitConfigured={handleSplitConfigured}
            onBack={() => handleEditStep(5)}
          />
        );
        
      case 7:
        return expenseType === 'manual' && manualExpenseData && (
          <ManualExpenseReviewStep
            expenseData={manualExpenseData}
            customAmounts={customAmounts}
            onFinalize={handleFinalize}
            onBack={() => handleEditStep(6)}
            onLoadingChange={handleLoadingChange}
            isLoading={isLoading}
          />
        );
      
      default:
        return <p>Something went wrong. Please refresh.</p>;
    }
  };

  return (
    <div className={cn(
      "w-full h-full flex flex-col",
      "transition-opacity duration-300 ease-in-out",
      isLoading && "opacity-75 pointer-events-none"
    )}>
      {isComplete ? (
        <div className="flex flex-col items-center justify-center text-center py-10 flex-grow animate-fade-in">
          <CheckCircle className="h-16 w-16 text-accent mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Expense Added!</h2>
          <p className="text-muted-foreground mb-6 px-4">
            The expense has been successfully added to your Splitwise group.
          </p>
          <Button
            onClick={handleRestart}
            size="lg"
            className="w-full max-w-xs tap-scale"
          >
            Add Another Expense
          </Button>
        </div>
      ) : (
        <div className="flex-grow">
          {renderStepContent()}
        </div>
      )}
    </div>
  );
}

export default function BillSplitterPage() {
  return <BillSplitterFlow />;
}
