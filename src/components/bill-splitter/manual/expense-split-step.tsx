"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Users, Calculator, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { ManualExpenseData } from "@/types";
import { cn } from "@/lib/utils";
import { formatCurrency, parseCurrency, validateCurrencyAmount } from "@/lib/currency";
import { getCardStyle } from "@/lib/design-system";
import { ValidationService } from "@/services/validation-service";

interface ManualExpenseSplitStepProps {
  expenseData: ManualExpenseData;
  onSplitConfigured: (splitType: 'equal' | 'custom', customAmounts?: Record<string, number>) => void;
  onBack: () => void;
}

export function ManualExpenseSplitStep({
  expenseData,
  onSplitConfigured,
  onBack
}: ManualExpenseSplitStepProps) {
  const [splitType, setSplitType] = React.useState<'equal' | 'custom'>('equal');
  const [customAmounts, setCustomAmounts] = React.useState<Record<string, number>>({});
  const { toast } = useToast();

  React.useEffect(() => {
    // Initialize custom amounts with equal split
    const equalAmount = expenseData.amount / expenseData.members.length;
    const initialAmounts: Record<string, number> = {};
    expenseData.members.forEach(member => {
      initialAmounts[member.id] = equalAmount;
    });
    setCustomAmounts(initialAmounts);
  }, [expenseData.amount, expenseData.members]);

  const handleCustomAmountChange = (memberId: string, value: string) => {
    const numValue = parseCurrency(value);
    if (validateCurrencyAmount(numValue)) {
      setCustomAmounts(prev => ({ ...prev, [memberId]: numValue }));
    }
  };

  const handleProceed = () => {
    const validation = ValidationService.validateManualSplits(
      { amount: expenseData.amount, splitType },
      customAmounts
    );

    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast({
          title: splitType === 'custom' ? "Split Mismatch" : "Invalid Amounts",
          description: error,
          variant: "destructive",
        });
      });
      return;
    }

    onSplitConfigured(splitType, splitType === 'custom' ? customAmounts : undefined);
  };

  const totalCustomAmount = Object.values(customAmounts).reduce((sum, val) => sum + val, 0);
  const splitValidation = ValidationService.validateManualSplits(
    { amount: expenseData.amount, splitType },
    customAmounts
  );

  // Calculate proper equal amounts with cent distribution
  const getEqualAmount = (memberIndex: number): number => {
    const totalCents = Math.round(expenseData.amount * 100);
    const memberCount = expenseData.members.length;
    const baseCents = Math.floor(totalCents / memberCount);
    const remainderCents = totalCents % memberCount;
    const extraCent = memberIndex < remainderCents ? 1 : 0;
    return (baseCents + extraCent) / 100;
  };

  return (
    <div className="flex flex-col min-h-full space-y-6 animate-fade-in pt-2">
      <div className="px-1">
        <h2 className="text-2xl font-semibold mb-1">Split Options</h2>
        <p className="text-muted-foreground text-sm">Choose how to divide {formatCurrency(expenseData.amount)}.</p>
      </div>

      <div className="px-1">
        <Label className="text-sm font-medium block mb-3">Split Method</Label>
        <ToggleGroup
          type="single"
          value={splitType}
          onValueChange={(value) => value && setSplitType(value as 'equal' | 'custom')}
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
          <Card className="border rounded-lg overflow-hidden bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Equal Split</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expenseData.members.map((member, index) => (
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
          <Card className="border rounded-lg overflow-hidden bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Custom Split</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-80">
                <div className="space-y-3 pr-2">
                  {expenseData.members.map((member) => (
                    <div key={member.id} className="space-y-2">
                      <Label htmlFor={`amount-${member.id}`} className="text-sm font-medium">
                        {member.first_name} {member.last_name}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          id={`amount-${member.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={customAmounts[member.id]?.toFixed(2) || '0.00'}
                          onChange={(e) => handleCustomAmountChange(member.id, e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total:</span>
                  <span className={cn(
                    "font-semibold",
                    Math.abs(totalCustomAmount - expenseData.amount) < 0.01
                      ? "text-primary"
                      : "text-destructive"
                  )}>
                    {formatCurrency(totalCustomAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Expected:</span>
                  <span>{formatCurrency(expenseData.amount)}</span>
                </div>
                {Math.abs(totalCustomAmount - expenseData.amount) > 0.01 && (
                  <p className="text-xs text-destructive mt-1">
                    Difference: {formatCurrency(Math.abs(totalCustomAmount - expenseData.amount))}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 mt-auto">
        <div className="flex gap-3 max-w-md mx-auto">
          <Button onClick={onBack} variant="outline" className="w-1/3 hover:bg-primary/10 hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={handleProceed}
            className="w-2/3 hover:bg-primary/10 hover:text-primary"
            disabled={!splitValidation.isValid}
          >
            <ArrowRight className="mr-2 h-4 w-4" /> Next: Review
          </Button>
        </div>
      </div>
    </div>
  );
}