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
import type { ManualExpenseData } from "@/types";
import { formatCurrency } from "@/lib/currency";
import { ExpenseService } from "@/services/expense-service";

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

  const finalSplits = React.useMemo(() => {
    return ExpenseService.calculateManualSplits(expenseData, customAmounts);
  }, [expenseData, customAmounts]);

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
      const expensePayload = ExpenseService.createManualExpensePayload(
        expenseData,
        finalSplits,
        payerId
      );

      console.log("Manual Expense Payload:", JSON.stringify(expensePayload, null, 2));
      
      await ExpenseService.submitExpense(expensePayload);

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
                {finalSplits.map((split, index) => {
                  const member = expenseData.members.find(m => m.id === split.userId);
                  return (
                    <div key={split.userId} className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {member ? `${member.first_name} ${member.last_name}` : `User ${split.userId}`}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        {formatCurrency(split.amountOwed)}
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