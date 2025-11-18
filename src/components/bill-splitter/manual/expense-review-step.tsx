"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBillSplitting } from "@/contexts/bill-splitting-context";
import { useToast } from "@/hooks/use-toast";
import { SplitwiseService, ExpensePayloadService, type SplitwiseUser } from "@/types";
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
    selectedMembers,
    reset
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

  // Fetch all group members if this is a group expense
  const [allGroupMembers, setAllGroupMembers] = React.useState<SplitwiseUser[]>([]);
  const [isLoadingGroupMembers, setIsLoadingGroupMembers] = React.useState(false);

  React.useEffect(() => {
    const fetchGroupMembers = async () => {
      // Only fetch if it's a group expense (groupId is not null, not '0', and not undefined)
      if (selectedGroupId && selectedGroupId !== '0' && selectedGroupId !== null) {
        setIsLoadingGroupMembers(true);
        try {
          const members = await SplitwiseService.getGroupMembers(selectedGroupId);
          setAllGroupMembers(members);
        } catch (error) {
          console.error('Failed to fetch group members:', error);
          // Fallback to selected members if fetch fails
          setAllGroupMembers(manualExpenseData?.members || []);
        } finally {
          setIsLoadingGroupMembers(false);
        }
      } else {
        // For friend expenses, use selected members
        setAllGroupMembers(manualExpenseData?.members || []);
      }
    };

    if (manualExpenseData) {
      fetchGroupMembers();
    }
  }, [selectedGroupId, manualExpenseData]);

  // Determine which members to show in "Who paid?" dropdown
  // For groups: show all group members (even if expense involves only one person)
  // For friends: show only selected friends
  const payerOptions = React.useMemo(() => {
    if (selectedGroupId && selectedGroupId !== '0' && selectedGroupId !== null) {
      // Group expense: show all group members
      return allGroupMembers.length > 0 ? allGroupMembers : (manualExpenseData?.members || []);
    } else {
      // Friend expense: show only selected members
      return manualExpenseData?.members || [];
    }
  }, [selectedGroupId, allGroupMembers, manualExpenseData?.members]);

  React.useEffect(() => {
    // Set default payer if not set and we have payer options
    if (payerOptions.length > 0 && !payerId) {
      // Prefer selecting the first member from the expense, or fallback to first in payer options
      const defaultPayer = manualExpenseData?.members[0]?.id || payerOptions[0]?.id;
      if (defaultPayer) {
        setPayerId(defaultPayer);
      }
    }
  }, [payerOptions, payerId, setPayerId, manualExpenseData?.members]);

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
      const groupId = manualExpenseData!.groupId === '0' ? 0 : parseInt(manualExpenseData!.groupId);

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

      // Convert to FinalSplit format for the service
      const finalSplits = manualExpenseData!.members.map(member => ({
        userId: member.id,
        amountOwed: memberAmounts[member.id]
      }));

      // Check if payer is in the selected members
      const payerIsInSelectedMembers = manualExpenseData!.members.some(m => m.id === payerId);
      
      // If payer is not in selected members, add them to finalSplits with amountOwed = 0
      // This handles the case where someone else in the group paid for an expense involving only one person
      let adjustedFinalSplits = [...finalSplits];
      if (!payerIsInSelectedMembers && payerId) {
        // Find the payer in the all group members
        const payerMember = payerOptions.find(m => m.id === payerId);
        if (payerMember) {
          adjustedFinalSplits.push({
            userId: payerMember.id,
            amountOwed: 0 // Payer doesn't owe anything since they paid
          });
        }
      }

      // Use the ExpensePayloadService to generate the payload
      const expensePayload = ExpensePayloadService.generateExpensePayload(
        adjustedFinalSplits,
        manualExpenseData!.amount,
        {
          storeName: manualExpenseData!.title,
          date: manualExpenseData!.date,
          expenseNotes: manualExpenseData!.notes || '',
          payerId: payerId!,
          groupId
        }
      );

      // Validate the expense payload
      const validation = ExpensePayloadService.validateExpensePayload(expensePayload, manualExpenseData!.amount);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Validation failed');
      }

      console.log("Expense Payload:", JSON.stringify(expensePayload, null, 2));
      const result = await SplitwiseService.createExpense(expensePayload);

      // Check for API errors in the response
      if (result && typeof result === 'object' && 'errors' in result && result.errors) {
        const errorMessages = [];
        if (result.errors.base && Array.isArray(result.errors.base)) {
          errorMessages.push(...result.errors.base);
        }
        // Handle other error types if they exist
        Object.entries(result.errors).forEach(([key, value]) => {
          if (key !== 'base' && Array.isArray(value)) {
            errorMessages.push(...value);
          }
        });
        
        if (errorMessages.length > 0) {
          const errorMessage = errorMessages.join('; ');
          throw new Error(errorMessage);
        }
      }

      toast({
        title: "Success!",
        description: "Expense has been added to Splitwise.",
      });

      setComplete(true);
    } catch (error: any) {
      console.error('Failed to create expense:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create expense. Please try again.",
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
            <Select value={payerId} onValueChange={setPayerId} disabled={isLoadingGroupMembers}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isLoadingGroupMembers ? "Loading members..." : "Select who paid"} />
              </SelectTrigger>
              <SelectContent>
                {payerOptions.map((member) => (
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
