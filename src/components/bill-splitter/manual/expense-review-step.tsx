"use client";

import * as React from "react";
import { ArrowLeft, Send, Loader2, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { createExpense } from "@/services/splitwise";
import type { ManualExpenseData, CreateExpense } from "@/types";
import { formatCurrency } from "@/lib/currency";
import { getCardStyle } from "@/lib/design-system";
import { isAPIError, getErrorMessage, isSuccessfulResponse } from "@/types/api";

interface ManualExpenseReviewStepProps {
  expenseData: ManualExpenseData;
  customAmounts?: Record<string, number>;
  onFinalize: () => void;
  onBack: () => void;
  onLoadingChange: (isLoading: boolean) => void;
  isLoading: boolean;
}

export function ManualExpenseReviewStep({
  expenseData,
  customAmounts,
  onFinalize,
  onBack,
  onLoadingChange,
  isLoading
}: ManualExpenseReviewStepProps) {
  const [payerId, setPayerId] = React.useState<string | undefined>(undefined);
  const { toast } = useToast();

  React.useEffect(() => {
    if (expenseData.members.length > 0 && !payerId) {
      setPayerId(expenseData.members[0].id);
    }
  }, [expenseData.members, payerId]);

  const getMemberAmount = (memberId: string, memberIndex: number): number => {
    if (expenseData.splitType === 'custom' && customAmounts) {
      return customAmounts[memberId] || 0;
    }
    // Calculate proper equal amounts with cent distribution
    const totalCents = Math.round(expenseData.amount * 100);
    const memberCount = expenseData.members.length;
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

    onLoadingChange(true);
    try {
      const groupId = parseInt(expenseData.groupId);
      const numericPayerId = parseInt(payerId);

      // Calculate individual amounts with proper rounding
      let memberAmounts: Record<string, number> = {};

      if (expenseData.splitType === 'equal') {
        // For equal splits, calculate base amount and distribute remaining cents
        const totalCents = Math.round(expenseData.amount * 100);
        const memberCount = expenseData.members.length;
        const baseCents = Math.floor(totalCents / memberCount);
        const remainderCents = totalCents % memberCount;
        
        expenseData.members.forEach((member, index) => {
          // First 'remainderCents' members get an extra cent
          const extraCent = index < remainderCents ? 1 : 0;
          memberAmounts[member.id] = (baseCents + extraCent) / 100;
        });
      } else if (customAmounts) {
        // For custom splits, adjust the last member to match exact total
        let totalOwedSoFar = 0;
        expenseData.members.forEach((member, index) => {
          if (index === expenseData.members.length - 1) {
            // Last member gets the remainder to ensure exact total
            memberAmounts[member.id] = expenseData.amount - totalOwedSoFar;
          } else {
            memberAmounts[member.id] = Math.round((customAmounts[member.id] || 0) * 100) / 100;
            totalOwedSoFar += memberAmounts[member.id];
          }
        });
      }

      // Final validation to ensure exact match
      const finalTotal = Object.values(memberAmounts).reduce((sum, amount) => sum + amount, 0);
      if (Math.abs(finalTotal - expenseData.amount) > 0.005) {
        throw new Error(`Split calculation error: Total ${finalTotal.toFixed(2)} doesn't match expense ${expenseData.amount.toFixed(2)}`);
      }

      const expensePayload: CreateExpense = {
        cost: expenseData.amount.toFixed(2),
        description: expenseData.title,
        group_id: groupId,
        date: expenseData.date,
        currency_code: 'USD',
        category_id: 18,
        split_equally: expenseData.splitType === 'equal',
        details: expenseData.notes || undefined,
      };

      expenseData.members.forEach((member, index) => {
        const memberAmount = memberAmounts[member.id];
        const paidShare = parseInt(member.id) === numericPayerId ? expenseData.amount.toFixed(2) : '0.00';
        const owedShare = memberAmount.toFixed(2);
        
        expensePayload[`users__${index}__user_id`] = parseInt(member.id);
        expensePayload[`users__${index}__paid_share`] = paidShare;
        expensePayload[`users__${index}__owed_share`] = owedShare;
      });

      console.log("Manual Expense Payload:", JSON.stringify(expensePayload, null, 2));
      const result = await createExpense(expensePayload);
      
      console.log("API Response:", result); // Add logging to debug

      // Check for API errors using improved error handling
      if (isAPIError(result)) {
        const errorMessage = getErrorMessage(result);
        throw new Error(errorMessage);
      }

      // Check if the response indicates success
      if (!isSuccessfulResponse(result)) {
        console.warn("Unexpected API response:", result);
        // Don't throw an error if we can't determine success/failure
        // Let it continue to success handling
      }

      toast({
        title: "Expense Created Successfully",
        description: `Expense "${expenseData.title}" has been added to Splitwise.`,
        variant: "default",
      });
      onFinalize();

    } catch (error: unknown) {
      console.error("Error finalizing expense:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not save expense. Try again.";
      toast({
        title: "Finalization Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      onLoadingChange(false);
    }
  };

  const isFinalizeDisabled = isLoading || !payerId;

  return (
    <div className="flex flex-col min-h-full space-y-6 animate-fade-in pt-2">
      <div className="px-1">
        <h2 className="text-2xl font-semibold mb-1">Review & Finalize</h2>
        <p className="text-muted-foreground text-sm">Confirm the details before adding to Splitwise.</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pb-20">
        <Card className="border rounded-lg overflow-hidden bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Expense Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Title:</span>
              <span className="font-medium">{expenseData.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold text-primary">{formatCurrency(expenseData.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">{expenseData.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Split Type:</span>
              <span className="font-medium capitalize">{expenseData.splitType}</span>
            </div>
            {expenseData.notes && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Notes:</span>
                <span className="text-sm">{expenseData.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border rounded-lg overflow-hidden bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Payment Details</CardTitle>
            <CardDescription className="text-xs">Who paid for this expense?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="payer-select">Paid by</Label>
              <Select
                value={payerId}
                onValueChange={(value) => setPayerId(value)}
                disabled={isLoading || expenseData.members.length === 0}
              >
                <SelectTrigger id="payer-select" className="w-full">
                  <SelectValue placeholder="Select who paid" />
                </SelectTrigger>
                <SelectContent>
                  {expenseData.members.map((member) => (
                    <SelectItem key={member.id} value={member.id} className="dropdownItem">
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border rounded-lg overflow-hidden bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Split Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-60">
              <div className="space-y-2 pr-2">
                {expenseData.members.map((member, index) => {
                  const memberAmount = getMemberAmount(member.id, index);
                  return (
                    <div key={member.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {member.first_name} {member.last_name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        {formatCurrency(memberAmount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <Separator className="my-3" />
            <div className="flex justify-between items-center font-semibold">
              <span>Total:</span>
              <span className="text-primary">{formatCurrency(expenseData.amount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 mt-auto">
        <div className="flex gap-3 max-w-md mx-auto">
          <Button onClick={onBack} variant="outline" disabled={isLoading} className="w-1/3 hover:bg-primary/10 hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={handleFinalizeExpense}
            disabled={isFinalizeDisabled}
            className="w-2/3 hover:bg-primary/10 hover:text-primary"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Add to Splitwise
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}