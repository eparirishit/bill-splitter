"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBillSplitting } from "@/contexts/bill-splitting-context";
import { useToast } from "@/hooks/use-toast";
import { ExpenseCalculationService } from "@/services/expense-calculations";
import { ExpenseValidationService } from "@/services/expense-validation";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function ManualExpenseDetailsStep() {
  const { toast } = useToast();
  const {
    selectedMembers,
    selectedGroupId,
    manualExpenseForm,
    setManualExpenseFormTitle,
    setManualExpenseFormAmount,
    setManualExpenseFormNotes,
    setManualExpenseFormDate,
    goToNextStep,
    goToPreviousStep,
    setManualExpenseData
  } = useBillSplitting();

  // Guard: If required state is missing, show a message
  // Note: selectedGroupId can be null for friend expenses (groupId: 0)
  if (!selectedMembers || selectedMembers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-8rem)]">
        <p className="text-muted-foreground mb-4">Please select a group or friends first.</p>
        <Button onClick={goToPreviousStep} variant="outline">Back to Selection</Button>
      </div>
    );
  }

  const handleProceed = () => {
    if (!selectedMembers.length) {
      toast({
        title: "Missing Data",
        description: "Please select members or friends first.",
        variant: "destructive",
      });
      return;
    }

    // Validate the form data
    const validation = ExpenseValidationService.validateExpenseDetails({
      title: manualExpenseForm.title,
      amount: manualExpenseForm.amount,
      date: manualExpenseForm.date,
      members: selectedMembers
    });

    if (!validation.isValid) {
      toast({
        title: "Validation Error",
        description: validation.errors[0],
        variant: "destructive",
      });
      return;
    }

    // Create the expense data
    const parsedAmount = parseFloat(manualExpenseForm.amount);
    const expenseData = {
      title: manualExpenseForm.title.trim(),
      amount: parsedAmount,
      date: manualExpenseForm.date,
      groupId: selectedGroupId,
      members: selectedMembers,
      splitType: 'equal' as const,
      notes: manualExpenseForm.notes.trim() || undefined
    };

    setManualExpenseData(expenseData);
    goToNextStep();
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return ExpenseCalculationService.formatCurrency(num);
  };

  return (
    <div className="flex flex-col min-h-full space-y-6 animate-fade-in pt-2">
      <div className="px-1">
        <h2 className="text-2xl font-semibold mb-1">Expense Details</h2>
        <p className="text-muted-foreground text-sm">Enter the details for your expense.</p>
      </div>

      <div className="flex-1 space-y-4 pb-20">
        <Card className="card-modern">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-title" className="text-sm font-medium">
                Expense Title
              </Label>
              <Input
                id="expense-title"
                type="text"
                placeholder="e.g., Dinner at Restaurant"
                value={manualExpenseForm.title}
                onChange={(e) => setManualExpenseFormTitle(e.target.value)}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-amount" className="text-sm font-medium">
                Total Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={manualExpenseForm.amount}
                  onChange={(e) => setManualExpenseFormAmount(e.target.value)}
                  className="pl-8 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-date" className="text-sm font-medium">
                Date
              </Label>
              <Input
                id="expense-date"
                type="date"
                value={manualExpenseForm.date}
                onChange={(e) => setManualExpenseFormDate(e.target.value)}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-notes" className="text-sm font-medium">
                Notes (Optional)
              </Label>
              <Textarea
                id="expense-notes"
                placeholder="Add any additional notes about this expense..."
                value={manualExpenseForm.notes}
                onChange={(e) => setManualExpenseFormNotes(e.target.value)}
                className="text-base min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium">Split Between</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
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
                  {/* <span className="text-sm text-muted-foreground">
                    {formatCurrency(((parseFloat(manualExpenseForm.amount) || 0) / selectedMembers.length).toString())}
                  </span> */}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 mt-auto">
        <div className="flex gap-3 max-w-md mx-auto">
          <Button onClick={goToPreviousStep} variant="outline" className="w-1/3 hover:bg-primary/10 hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button 
            onClick={handleProceed} 
            className="w-2/3 hover:bg-primary/10 hover:text-primary"
            disabled={!manualExpenseForm.title.trim() || !manualExpenseForm.amount || !manualExpenseForm.date}
          >
            <ArrowRight className="mr-2 h-4 w-4" /> Next: Split
          </Button>
        </div>
      </div>
    </div>
  );
}
