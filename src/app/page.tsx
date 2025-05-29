"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UploadStep } from "@/components/bill-splitter/upload-step";
import { GroupSelectionStep } from "@/components/bill-splitter/group-selection-step";
import { ItemSplittingStep } from "@/components/bill-splitter/item-splitting-step";
import { ReviewStep } from "@/components/bill-splitter/review-step";
import { CheckCircle, Loader2 } from "lucide-react";
import type { ExtractReceiptDataOutput, SplitwiseUser, ItemSplit } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function BillSplitterFlow() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [currentStep, setCurrentStep] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [billData, setBillData] = React.useState<ExtractReceiptDataOutput | null>(null);
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = React.useState<SplitwiseUser[]>([]);
  const [itemSplits, setItemSplits] = React.useState<ItemSplit[]>([]);
  const [taxSplitMembers, setTaxSplitMembers] = React.useState<string[]>([]);
  const [otherChargesSplitMembers, setOtherChargesSplitMembers] = React.useState<string[]>([]);
  const [isComplete, setIsComplete] = React.useState(false);


  React.useEffect(() => {
    // Only redirect if auth check is complete and user is not authenticated
    if (!isAuthLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);


  const handleDataExtracted = (data: ExtractReceiptDataOutput) => {
    setBillData(data);
    setCurrentStep(2);
    setIsLoading(false);
  };

  const handleGroupAndMembersSelected = (groupId: string, members: SplitwiseUser[]) => {
    setSelectedGroupId(groupId);
    const membersWithGroup = members.map(m => ({ ...m, _groupDetails: { id: groupId, name: "Selected Group" } }));
    setSelectedMembers(membersWithGroup);
    setCurrentStep(3);
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

   const handleEditStep = (step: number) => {
     if (step >= 1 && step < currentStep && !isComplete) {
       setCurrentStep(step);
     }
   };

  const handleFinalize = () => {
    // Add slight delay for visual feedback before showing completion
    setIsLoading(true);
    setTimeout(() => {
        setIsComplete(true);
        setIsLoading(false);
    }, 500);
  };

  const handleRestart = () => {
    // Reset all state variables to initial values
    setCurrentStep(1);
    setIsLoading(false);
    setBillData(null);
    setSelectedGroupId(null);
    setSelectedMembers([]);
    setItemSplits([]);
    setTaxSplitMembers([]);
    setOtherChargesSplitMembers([]);
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

  // Determine the component to render based on the current step
  const renderStepContent = () => {
      switch (currentStep) {
          case 1:
              return <UploadStep onDataExtracted={handleDataExtracted} onLoadingChange={handleLoadingChange} isLoading={isLoading} />;
          case 2:
              return billData && <GroupSelectionStep onGroupAndMembersSelected={handleGroupAndMembersSelected} onLoadingChange={handleLoadingChange} isLoading={isLoading} onBack={() => handleEditStep(1)} />;
          case 3:
              return billData && selectedMembers.length > 0 && (
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
              return billData && selectedMembers.length > 0 && itemSplits.length > 0 && (
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
        {/* Conditional Rendering of Steps or Completion Message */}
        {isComplete ? (
          <div className="flex flex-col items-center justify-center text-center py-10 flex-grow animate-fade-in">
            <CheckCircle className="h-16 w-16 text-accent mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Expense Added!</h2>
            <p className="text-muted-foreground mb-6 px-4">The expense has been successfully added to your Splitwise group.</p>
            <Button
              onClick={handleRestart}
              size="lg"
              className="w-full max-w-xs tap-scale"
            >
              Split Another Bill
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
