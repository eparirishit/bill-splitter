"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useExpenseForm } from "@/hooks/use-expense-form";
import { useToast } from "@/hooks/use-toast";
import { ExpenseCalculationService } from "@/services/expense-calculations";
import type { ManualExpenseData, SplitwiseUser } from "@/types";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface ManualExpenseDetailsStepProps {
  selectedMembers: SplitwiseUser[];
  onExpenseDetailsSet: (expenseData: ManualExpenseData) => void;
  onBack: () => void;
  groupId: string;
}

export function ManualExpenseDetailsStep({
  selectedMembers,
  onExpenseDetailsSet,
  onBack,
  groupId
}: ManualExpenseDetailsStepProps) {
  const { toast } = useToast();
  const {
    title,
    amount,
    notes,
    date,
    errors,
    setTitle,
    setAmount,
    setNotes,
    setDate,
    validateAndSubmit,
    clearErrors
  } = useExpenseForm();

  const handleProceed = () => {
    const expenseData = validateAndSubmit(selectedMembers, groupId);
    if (expenseData) {
      onExpenseDetailsSet(expenseData);
    } else {
      // Show first error in toast
      if (errors.length > 0) {
        toast({
          title: "Validation Error",
          description: errors[0],
          variant: "destructive",
        });
      }
    }
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-base"
                />
              </div>
              {amount && (
                <p className="text-xs text-muted-foreground">
                  Total: {formatCurrency(amount)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-date" className="text-sm font-medium">
                Date
              </Label>
              <Input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-notes" className="text-sm font-medium">
                Notes <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="expense-notes"
                placeholder="e.g., Split for dinner with friends"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-base min-h-[80px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {notes.length}/500 characters
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Split Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              This expense will be split among {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''}:
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedMembers.map((member, index) => (
                <span key={member.id} className="text-xs bg-muted px-2 py-1 rounded">
                  {member.first_name} {member.last_name}
                  {index < selectedMembers.length - 1 ? ',' : ''}
                </span>
              ))}
            </div>
            {amount && selectedMembers.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Each person: {formatCurrency((parseFloat(amount) / selectedMembers.length).toString())}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 mt-auto">
        <div className="flex gap-3 max-w-md mx-auto">
          <Button onClick={onBack} variant="outline" className="w-1/3 hover:bg-primary/10 hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button 
            onClick={handleProceed} 
            className="w-2/3 hover:bg-primary/10 hover:text-primary"
            disabled={!title.trim() || !amount || parseFloat(amount) <= 0}
          >
            <ArrowRight className="mr-2 h-4 w-4" /> Next: Split Options
          </Button>
        </div>
      </div>
    </div>
  );
}
