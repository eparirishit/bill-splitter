"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBillSplitting } from "@/contexts/bill-splitting-context";
import { useToast } from "@/hooks/use-toast";
import type { CreateExpense } from "@/types";
import { ArrowLeft, Loader2, Send, UserCircle } from "lucide-react";
import * as React from "react";

export function ManualExpenseReviewStep() {
  const { toast } = useToast();
  const {
    manualExpenseData,
    customAmounts,
    splitType,
    payerId,
    setPayerId,
    isLoading,
    setLoading,
    setComplete,
    goToPreviousStep,
    selectedGroupId,
    selectedMembers
  } = useBillSplitting();

  // Guard: If required state is missing, show a message
  if (!manualExpenseData || !selectedGroupId || !selectedMembers || selectedMembers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-8rem)]">
        <p className="text-muted-foreground mb-4">Please complete the expense details and group selection first.</p>
        <Button onClick={goToPreviousStep} variant="outline">Back</Button>
      </div>
    );
  }

  React.useEffect(() => {
    if (manualExpenseData?.members.length > 0 && !payerId) {
      setPayerId(manualExpenseData.members[0].id);
    }
  }, [manualExpenseData?.members, payerId, setPayerId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);
  };

  const getMemberAmount = (memberId: string, memberIndex: number): number => {
    if (splitType === 'custom' && customAmounts) {
      return customAmounts[memberId] || 0;
    }
    // Calculate proper equal amounts with cent distribution
    const totalCents = Math.round(manualExpenseData!.amount * 100);
    const memberCount = manualExpenseData!.members.length;
    const baseCents = Math.floor(totalCents / memberCount);
    const remainderCents = totalCents % memberCount;
    const extraCent = memberIndex < remainderCents ? 1 : 0;
    return (baseCents + extraCent) / 100;
  };

  const handleFinalizeExpense = async () => {
    if (!payerId) {
      toast({
        title: "Payer Required",
        description: "Please select who paid for this expense.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const groupId = parseInt(manualExpenseData!.groupId);
      const numericPayerId = parseInt(payerId);

      // Calculate individual amounts with proper rounding
      let memberAmounts: Record<string, number> = {};

      if (splitType === 'equal') {
        // For equal splits, calculate base amount and distribute remaining cents
        const totalCents = Math.round(manualExpenseData!.amount * 100);
        const memberCount = manualExpenseData!.members.length;
        const baseCents = Math.floor(totalCents / memberCount);
        const remainderCents = totalCents % memberCount;
        
        manualExpenseData!.members.forEach((member, index) => {
          // First 'remainderCents' members get an extra cent
          const extraCent = index < remainderCents ? 1 : 0;
          memberAmounts[member.id] = (baseCents + extraCent) / 100;
        });
      } else if (customAmounts) {
        // For custom splits, adjust the last member to match exact total
        let totalOwedSoFar = 0;
        manualExpenseData!.members.forEach((member, index) => {
          if (index === manualExpenseData!.members.length - 1) {
            // Last member gets the remainder to ensure exact total
            memberAmounts[member.id] = manualExpenseData!.amount - totalOwedSoFar;
          } else {
            memberAmounts[member.id] = Math.round((customAmounts[member.id] || 0) * 100) / 100;
            totalOwedSoFar += memberAmounts[member.id];
          }
        });
      }

      // Create the expense payload
      const expensePayload: CreateExpense = {
        group_id: groupId,
        description: manualExpenseData!.title,
        cost: manualExpenseData!.amount.toString(),
        date: manualExpenseData!.date
      };

      // Dummy API call for now - simulate Splitwise API call
      console.log('Making dummy API call to Splitwise...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate 2-second API call

      // Simulate successful response
      const result = {
        success: true,
        expense_id: Math.floor(Math.random() * 1000000),
        message: 'Expense created successfully'
      };

      console.log('Dummy API response:', result);

      toast({
        title: "Success!",
        description: "Expense has been added to Splitwise.",
      });

      setComplete(true);
    } catch (error) {
      console.error('Failed to create expense:', error);
      toast({
        title: "Error",
        description: "Failed to create expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
        <h2 className="text-2xl font-semibold mb-1">Review & Submit</h2>
        <p className="text-muted-foreground text-sm">Review your expense details before submitting to Splitwise.</p>
      </div>

      <div className="flex-1 space-y-4 pb-20">
        <Card className="card-modern">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Expense Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Title:</span>
              <span className="font-medium">{manualExpenseData.title}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Date:</span>
              <span className="font-medium">
                {new Date(manualExpenseData.date + 'T00:00:00').toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            {manualExpenseData.notes && (
              <div className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground">Notes:</span>
                <span className="font-medium text-right max-w-[60%]">
                  {manualExpenseData.notes}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Split Details</CardTitle>
            <CardDescription>
              {splitType === 'equal' ? 'Equal split' : 'Custom split'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {manualExpenseData.members.map((member, index) => (
                  <div key={member.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium">
                        {member.first_name} {member.last_name}
                      </span>
                    </div>
                    <span className="font-semibold text-primary">
                      {formatCurrency(getMemberAmount(member.id, index))}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Who Paid?</CardTitle>
            <CardDescription>
              Select who paid for this expense
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={payerId} onValueChange={setPayerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select who paid" />
              </SelectTrigger>
              <SelectContent>
                {manualExpenseData.members.map((member) => (
                  <SelectItem 
                    key={member.id} 
                    value={member.id}
                    className="text-base focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary"
                  >
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4" />
                      {member.first_name} {member.last_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 mt-auto">
        <div className="flex gap-3 max-w-md mx-auto">
          <Button 
            onClick={goToPreviousStep} 
            variant="outline" 
            className="w-1/3 hover:bg-primary/10 hover:text-primary"
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button 
            onClick={handleFinalizeExpense} 
            className="w-2/3 hover:bg-primary/10 hover:text-primary"
            disabled={isLoading || !payerId}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Add to Splitwise
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
