"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useBillSplitting } from "@/contexts/bill-splitting-context";
import { useManualExpenseSplitting } from "@/hooks/use-manual-expense-splitting";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Calculator, Users } from "lucide-react";
import React from "react";

export function ManualExpenseSplitStep() {
  const { toast } = useToast();
  const {
    manualExpenseData,
    customAmounts: contextCustomAmounts,
    setCustomAmounts: setContextCustomAmounts,
    splitType: contextSplitType,
    setSplitType: setContextSplitType,
    goToNextStep,
    goToPreviousStep,
    selectedGroupId,
    selectedMembers
  } = useBillSplitting();
  
  // Guard: If required state is missing, show a message
  // Note: selectedGroupId can be null for friend expenses (groupId: 0)
  if (!manualExpenseData || !selectedMembers || selectedMembers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-8rem)]">
        <p className="text-muted-foreground mb-4">Please complete the expense details and selection first.</p>
        <Button onClick={goToPreviousStep} variant="outline">Back</Button>
      </div>
    );
  }

  // Use the manual expense splitting hook
  const {
    splitType,
    customAmounts,
    getInputValue,
    setSplitType,
    handleCustomAmountChange,
    validateAndProceed
  } = useManualExpenseSplitting(manualExpenseData!);

  // Sync local state with context
  React.useEffect(() => {
    if (contextCustomAmounts) {
      // Update local state from context if available
      Object.entries(contextCustomAmounts).forEach(([memberId, amount]) => {
        handleCustomAmountChange(memberId, amount.toString());
      });
    }
  }, [contextCustomAmounts]);

  // Sync splitType with context
  React.useEffect(() => {
    if (contextSplitType && contextSplitType !== splitType) {
      setSplitType(contextSplitType);
    }
  }, [contextSplitType, splitType, setSplitType]);

  const handleSplitTypeChange = (value: string | undefined) => {
    if (value && (value === 'equal' || value === 'custom')) {
      setSplitType(value);
      setContextSplitType(value);
    }
  };

  const handleProceed = () => {
    const result = validateAndProceed();
    
    if (!result.isValid) {
      if (splitType === 'custom') {
        const totalCustom = Object.values(customAmounts).reduce((sum, val) => sum + val, 0);
        const difference = Math.abs(totalCustom - manualExpenseData!.amount);
        
        if (difference > 0.01) {
          toast({
            title: "Split Mismatch",
            description: `Custom amounts total $${totalCustom.toFixed(2)} but expense is $${manualExpenseData!.amount.toFixed(2)}`,
            variant: "destructive",
          });
          return;
        }

        // Check for negative or zero amounts
        const invalidAmounts = Object.values(customAmounts).some(amount => amount <= 0);
        if (invalidAmounts) {
          toast({
            title: "Invalid Amounts",
            description: "All amounts must be greater than zero.",
            variant: "destructive",
          });
          return;
        }
      }
      return;
    }

    // Save to context and proceed
    setContextCustomAmounts(result.customAmounts);
    goToNextStep();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);
  };

  const totalCustomAmount = Object.values(customAmounts).reduce((sum, val) => sum + val, 0);
  
  // Calculate proper equal amounts with cent distribution
  const getEqualAmount = (memberIndex: number): number => {
    const totalCents = Math.round(manualExpenseData!.amount * 100);
    const memberCount = manualExpenseData!.members.length;
    const baseCents = Math.floor(totalCents / memberCount);
    const remainderCents = totalCents % memberCount;
    const extraCent = memberIndex < remainderCents ? 1 : 0;
    return (baseCents + extraCent) / 100;
  };

  if (!manualExpenseData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-8rem)]">
        <p className="text-muted-foreground">No expense data found. Please go back and enter expense details.</p>
        <Button onClick={goToPreviousStep} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full space-y-6 animate-fade-in pt-2">
      <div className="px-1">
        <h2 className="text-2xl font-semibold mb-1">Split Options</h2>
        <p className="text-muted-foreground text-sm">Choose how to divide {formatCurrency(manualExpenseData.amount)}.</p>
      </div>

      <div className="px-1">
        <Label className="text-sm font-medium block mb-3">Split Method</Label>
        <ToggleGroup
          type="single"
          value={splitType}
          onValueChange={handleSplitTypeChange}
          className="grid grid-cols-2 gap-3"
        >
          <ToggleGroupItem
            value="equal"
            className="flex flex-col items-center justify-center h-auto p-4 rounded-lg border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary tap-scale"
          >
            <Users className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium">Split Equally</span>
            <span className="text-xs opacity-80">Amounts may vary by ¢1</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="custom"
            className="flex flex-col items-center justify-center h-auto p-4 rounded-lg border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary tap-scale"
          >
            <Calculator className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium">Custom Split</span>
            <span className="text-xs opacity-80">Set individual amounts</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex-1 pb-20">
        {splitType === 'equal' ? (
          <Card className="card-modern">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Equal Split</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {manualExpenseData.members.map((member, index) => (
                  <div key={member.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                    <span className="font-medium">
                      {member.first_name} {member.last_name}
                    </span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(getEqualAmount(index))}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="card-modern">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Custom Split</CardTitle>
              <p className="text-sm text-muted-foreground">Enter individual amounts for each person</p>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-80 px-6">
                <div className="space-y-4 py-2">
                  {manualExpenseData.members.map((member) => (
                    <div key={member.id} className="space-y-2">
                      <Label htmlFor={`amount-${member.id}`} className="text-sm font-medium">
                        {member.first_name} {member.last_name}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                          $
                        </span>
                        <Input
                          id={`amount-${member.id}`}
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={getInputValue(member.id)}
                          onChange={(e) => handleCustomAmountChange(member.id, e.target.value, e.target)}
                          className="pl-8 pr-3 h-11 text-base w-full max-w-none"
                          style={{
                            // Remove spinner arrows for webkit browsers
                            WebkitAppearance: 'none',
                            MozAppearance: 'textfield'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="px-6 py-4 border-t bg-muted/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total:</span>
                  <span className={cn(
                    "font-semibold text-lg",
                    Math.abs(totalCustomAmount - manualExpenseData.amount) < 0.01 
                      ? "text-primary" 
                      : "text-destructive"
                  )}>
                    {formatCurrency(totalCustomAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                  <span>Expected:</span>
                  <span>{formatCurrency(manualExpenseData.amount)}</span>
                </div>
                {Math.abs(totalCustomAmount - manualExpenseData.amount) > 0.01 && (
                  <p className="text-xs text-destructive mt-2 font-medium">
                    Difference: {formatCurrency(Math.abs(totalCustomAmount - manualExpenseData.amount))}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 mt-auto">
        <div className="flex gap-3 max-w-md mx-auto">
          <Button onClick={goToPreviousStep} variant="outline" className="w-1/3 hover:bg-primary/10 hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button 
            onClick={handleProceed} 
            className="w-2/3 hover:bg-primary/10 hover:text-primary"
            disabled={splitType === 'custom' && Math.abs(totalCustomAmount - manualExpenseData.amount) > 0.01}
          >
            <ArrowRight className="mr-2 h-4 w-4" /> Next: Review
          </Button>
        </div>
      </div>
    </div>
  );
}
