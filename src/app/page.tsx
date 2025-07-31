"use client";

import { ExpenseTypeSelection } from "@/components/bill-splitter/common/expense-type-selection";
import { GroupSelectionStep } from "@/components/bill-splitter/common/group-selection-step";
import { ManualExpenseDetailsStep } from "@/components/bill-splitter/manual/expense-details-step";
import { ManualExpenseReviewStep } from "@/components/bill-splitter/manual/expense-review-step";
import { ManualExpenseSplitStep } from "@/components/bill-splitter/manual/expense-split-step";
import { ItemSplittingStep } from "@/components/bill-splitter/scan/item-splitting-step";
import { ReviewStep } from "@/components/bill-splitter/scan/review-step";
import { UploadStep } from "@/components/bill-splitter/scan/upload-step";
import { FeedbackModal } from "@/components/feedback/feedback-modal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useBillSplittingFlow } from "@/hooks/use-bill-splitting-flow";
import { cn } from "@/lib/utils";
import { CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

function BillSplitterFlow() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading, userId } = useAuth();
  const [showFeedbackModal, setShowFeedbackModal] = React.useState(false);
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
    
    // Handlers
    handleExpenseTypeSelect,
    handleDataExtracted,
    handleGroupAndMembersSelected,
    handleSplitsDefined,
    handleSplitConfigured,
    handleFinalize,
    handleRestart,
    handleLoadingChange,
    handleEditStep
  } = useBillSplittingFlow();

  React.useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

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
              userId={userId}
            />
          );
        } else if (expenseType === 'manual') {
          return (
            <GroupSelectionStep 
              selectedGroupId={selectedGroupId}
              selectedMembers={selectedMembers}
              onGroupAndMembersSelected={handleGroupAndMembersSelected} 
              onLoadingChange={handleLoadingChange} 
              isLoading={isLoading} 
              onBack={() => handleEditStep(0)} 
            />
          );
        }
        break;
      
      case 2:
        if (expenseType === 'scan') {
          return (
            <GroupSelectionStep 
              selectedGroupId={selectedGroupId}
              selectedMembers={selectedMembers}
              onGroupAndMembersSelected={handleGroupAndMembersSelected} 
              onLoadingChange={handleLoadingChange} 
              isLoading={isLoading} 
              onBack={() => handleEditStep(1)} 
            />
          );
        }
        break;
        
      case 3:
        return expenseType === 'scan' && billData && (
          <ItemSplittingStep
            billData={billData}
            selectedMembers={selectedMembers}
            itemSplits={itemSplits}
            taxSplit={taxSplit}
            otherChargesSplit={otherChargesSplit}
            onSplitsDefined={handleSplitsDefined}
            onBack={() => handleEditStep(2)}
            onLoadingChange={handleLoadingChange}
            isLoading={isLoading}
            userId={userId}
          />
        );
        
      case 4:
        return expenseType === 'scan' && billData && (
          <ReviewStep
            billData={billData}
            updatedBillData={updatedBillData}
            selectedMembers={selectedMembers}
            itemSplits={itemSplits}
            taxSplitMembers={taxSplit}
            otherChargesSplitMembers={otherChargesSplit}
            storeName={storeName}
            date={date}
            expenseNotes={expenseNotes}
            payerId={payerId}
            onFinalize={() => handleFinalize(() => setShowFeedbackModal(true))}
            onEdit={handleEditStep}
            onLoadingChange={handleLoadingChange}
            isLoading={isLoading}
            userId={userId}
          />
        );
        
      case 5:
        return expenseType === 'manual' && <ManualExpenseDetailsStep />;
        
      case 6:
        return expenseType === 'manual' && <ManualExpenseSplitStep />;
        
      case 7:
        return expenseType === 'manual' && <ManualExpenseReviewStep />;
      
      default:
        // If we reach here, something went wrong with step navigation
        // Try to recover by going back to step 0
        console.warn(`Invalid step ${currentStep}, resetting to step 0`);
        setTimeout(() => {
          handleEditStep(0);
        }, 100);
        return (
          <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-8rem)]">
            <p className="text-muted-foreground mb-4">Redirecting...</p>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        );
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
            onClick={() => {
              setShowFeedbackModal(false);
              handleRestart();
            }}
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

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        userId={userId}
        receiptId={receiptId}
      />
    </div>
  );
}

export default function BillSplitterPage() {
  return <BillSplitterFlow />;
}
