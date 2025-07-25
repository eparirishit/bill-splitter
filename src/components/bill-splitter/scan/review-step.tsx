"use client";

import * as React from "react";
import { AlertTriangle, Send, Loader2, Edit, ArrowLeft, UserCircle, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { ExtractReceiptDataOutput, SplitwiseUser, ItemSplit, FinalSplit } from "@/types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency";
import { ExpenseService } from "@/services/expense-service";
import { ValidationService } from "@/services/validation-service";
import { NotesService } from "@/services/notes-service";

interface ReviewStepProps {
  billData: ExtractReceiptDataOutput;
  selectedMembers: SplitwiseUser[];
  itemSplits: ItemSplit[];
  taxSplitMembers: string[];
  otherChargesSplitMembers: string[];
  onFinalize: () => void;
  onEdit: (step: number) => void;
  onLoadingChange: (isLoading: boolean) => void;
  isLoading: boolean;
  updatedBillData?: ExtractReceiptDataOutput;
}

export function ReviewStep({
  billData,
  selectedMembers,
  itemSplits,
  taxSplitMembers,
  otherChargesSplitMembers,
  onFinalize,
  onEdit,
  onLoadingChange,
  isLoading,
  updatedBillData
}: ReviewStepProps) {
  // Use updated bill data if available, otherwise use original
  const activeBillData = updatedBillData || billData;
  const { toast } = useToast();
  const [finalSplits, setFinalSplits] = React.useState<FinalSplit[]>([]);
  const [expenseNotes, setExpenseNotes] = React.useState<string>("");
  const [payerId, setPayerId] = React.useState<string | undefined>(undefined);
  const [storeName, setStoreName] = React.useState<string>(billData.storeName);
  const [date, setDate] = React.useState<string>(billData.date);

  const memberMap = React.useMemo(() => {
    return selectedMembers.reduce((acc, member) => {
      acc[member.id] = member;
      return acc;
    }, {} as Record<string, SplitwiseUser>);
  }, [selectedMembers]);

  React.useEffect(() => {
    if (selectedMembers.length > 0 && !payerId) {
      setPayerId(selectedMembers[0].id);
    }
  }, [selectedMembers, payerId]);

  // Calculate final splits and generate notes using services
  React.useEffect(() => {
    const splits = ExpenseService.calculateReceiptSplits(
      activeBillData,
      selectedMembers,
      itemSplits,
      taxSplitMembers,
      otherChargesSplitMembers
    );
    
    const notes = NotesService.generateReceiptNotes(activeBillData, storeName, date);
    
    setFinalSplits(splits);
    setExpenseNotes(notes);
  }, [activeBillData, itemSplits, selectedMembers, taxSplitMembers, otherChargesSplitMembers, storeName, date]);

  const handleFinalizeExpense = async () => {
    onLoadingChange(true);
    try {
      if (finalSplits.length === 0) {
        throw new Error("No splits calculated.");
      }
      if (!payerId) {
        throw new Error("Payer not selected.");
      }

      const groupIdStr = selectedMembers.find(m => m.id === payerId)?._groupDetails?.id || selectedMembers[0]?._groupDetails?.id;
      if (!groupIdStr) {throw new Error("Group ID not found for payer or any member.");}

      const expensePayload = ExpenseService.createExpensePayload(
        activeBillData,
        finalSplits,
        payerId,
        storeName,
        date,
        expenseNotes
      );

      // Final validation
      const totalOwed = parseFloat(finalSplits.reduce((sum, split) => sum + split.amountOwed, 0).toFixed(2));
      if (Math.abs(totalOwed - activeBillData.totalCost) > 0.005) {
        console.error("Final Validation Error:", { totalOwed, totalCost: activeBillData.totalCost, expensePayload });
        throw new Error(`Validation Error: Split total (${formatCurrency(totalOwed)}) doesn't match bill total (${formatCurrency(activeBillData.totalCost)}).`);
      }

      console.log("Expense Payload:", JSON.stringify(expensePayload, null, 2));
      
      await ExpenseService.submitExpense(expensePayload);

      toast({
        title: "Expense Created Successfully",
        description: `Expense for ${storeName} has been added to Splitwise.`,
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

  const splitValidation = ValidationService.validateFinalSplits(finalSplits, activeBillData.totalCost);
  const finalizationCheck = ValidationService.canFinalizeExpense(activeBillData, finalSplits, payerId);

  const billTotalForComparison = activeBillData.totalCost;
  const calculatedTotalFromSplits = parseFloat(finalSplits.reduce((sum, split) => sum + split.amountOwed, 0).toFixed(2));
  const totalMatches = Math.abs(calculatedTotalFromSplits - billTotalForComparison) < 0.015;

  const isFinalizeDisabled = isLoading || !totalMatches || activeBillData.discrepancyFlag || !payerId;
  const finalizeDisabledReason = activeBillData.discrepancyFlag
                                  ? "Cannot finalize due to bill discrepancy. Please edit item prices to fix the discrepancy."
                                  : !totalMatches
                                  ? "Cannot finalize due to calculation mismatch."
                                  : !payerId
                                  ? "Please select who paid the bill."
                                  : undefined;

  return (
    <div className="flex flex-col min-h-full space-y-6 animate-fade-in pt-2">
        {/* Step Title */}
        <div className="px-1">
           <h2 className="text-2xl font-semibold mb-1">Review & Finalize</h2>
           <p className="text-muted-foreground text-sm">Confirm the details before adding to Splitwise.</p>
        </div>

        {/* Scrollable Content Area with proper bottom padding */}
        <div className="flex-1 space-y-4 overflow-y-auto pb-20">
            {/* AI Warning */}
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400 mx-1">
              <Bot className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">AI-Extracted Data</p>
                <p className="text-xs mt-1">Please verify all amounts and details before finalizing the expense.</p>
              </div>
            </div>

            {/* Discrepancy Alerts */}
            {activeBillData.discrepancyFlag && (
               <div className="flex items-start gap-2 rounded-lg border border-orange-500/50 bg-orange-500/10 p-3 text-sm text-orange-700 dark:text-orange-400 mx-1">
                 <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                 <span><strong>Bill Discrepancy:</strong> {activeBillData.discrepancyMessage}</span>
               </div>
            )}
             {!splitValidation.isValid && !isLoading && (
                 <div className="flex items-start gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400 mx-1">
                   <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                   <span><strong>Calculation Warning:</strong> Final split total ({formatCurrency(splitValidation.calculatedTotal)}) doesn't exactly match bill total ({formatCurrency(activeBillData.totalCost)}). Check splits if difference is large.</span>
                 </div>
             )}

            {/* Summary Card */}
            <Card className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Expense Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="store-name" className="text-xs text-muted-foreground">Store</Label>
                      <Edit className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <Input
                      id="store-name"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      disabled={isLoading}
                      className="text-sm font-medium"
                      placeholder="Enter store name"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="expense-date" className="text-xs text-muted-foreground">Date</Label>
                      <Edit className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <Input
                      id="expense-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      disabled={isLoading}
                      className="text-sm font-medium"
                    />
                  </div>
                  <Separator className="my-3"/>
                  <div className="flex justify-between text-muted-foreground"><span>Items Subtotal:</span> <strong className="text-foreground">{formatCurrency(activeBillData.items.reduce((s, i) => s + i.price, 0))}</strong></div>
                   {(activeBillData.taxes ?? 0) > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax:</span> <strong className="text-foreground">{formatCurrency(activeBillData.taxes ?? 0)}</strong></div>}
                   {(activeBillData.otherCharges ?? 0) > 0 && <div className="flex justify-between text-muted-foreground"><span>Other Charges:</span> <strong className="text-foreground">{formatCurrency(activeBillData.otherCharges ?? 0)}</strong></div>}
                   {(activeBillData.discount ?? 0) > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount:</span> <strong className="text-green-600">-{formatCurrency(activeBillData.discount ?? 0)}</strong></div>}
                   <Separator className="my-3"/>
                  <div className="flex justify-between text-base font-semibold">
                      <span>Total Bill:</span>
                      <strong className="text-primary">{formatCurrency(billTotalForComparison)}</strong>
                  </div>
              </CardContent>
            </Card>

            {/* Payment Details Card */}
            <Card className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Payment Details</CardTitle>
                <CardDescription className="text-xs">Who paid this bill?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="payer-select">Paid by</Label>
                  <Select
                    value={payerId}
                    onValueChange={(value) => setPayerId(value)}
                    disabled={isLoading || selectedMembers.length === 0}
                  >
                    <SelectTrigger id="payer-select" className="w-full">
                      <SelectValue placeholder="Select who paid" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id} className="dropdownItem">
                          {member.first_name} {member.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedMembers.length === 0 && <p className="text-xs text-destructive pt-1">No members available to select as payer.</p>}
              </CardContent>
            </Card>

            {/* Final Splits Card */}
            <Card className="border rounded-lg overflow-hidden bg-card shadow-sm">
               <CardHeader className="flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base font-medium">Final Splits</CardTitle>
                    <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-primary hover:bg-primary/10" onClick={() => onEdit(3)} disabled={isLoading}>
                        <Edit className="mr-1 h-3 w-3" /> Edit Splits
                    </Button>
                </CardHeader>
              <CardContent>
                  <ScrollArea className="max-h-60 scrollArea">
                      <div className="space-y-1 pr-2">
                        {finalSplits.map(split => {
                          const member = memberMap[split.userId];
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
                   <p className="text-xs text-muted-foreground text-right pt-2 pr-1">
                     Calculated Split Total: <strong className={cn(totalMatches ? "text-primary" : "text-destructive")}>
                       {formatCurrency(calculatedTotalFromSplits)}
                     </strong>
                   </p>
              </CardContent>
            </Card>

             {/* Notes Card */}
             <Card className="border rounded-lg overflow-hidden bg-card shadow-sm">
               <CardHeader className="pb-3">
                 <CardTitle className="text-base font-medium">Expense Notes</CardTitle>
               </CardHeader>
               <CardContent>
                 <ScrollArea className="h-32 w-full rounded-md">
                   <div className="p-1">
                     <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{expenseNotes}</pre>
                   </div>
                 </ScrollArea>
               </CardContent>
             </Card>
        </div>

        {/* Sticky Footer Buttons - Fixed positioning */}
        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 mt-auto">
             <div className="flex gap-3 max-w-md mx-auto">
               <Button onClick={() => onEdit(3)} variant="outline" disabled={isLoading} className="w-1/3 hover:bg-primary/10 hover:text-primary">
                 <ArrowLeft className="mr-2 h-4 w-4" /> Back
               </Button>
               <TooltipProvider>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <div className="w-2/3">
                       <Button
                         onClick={handleFinalizeExpense}
                         disabled={!finalizationCheck.canFinalize || isLoading}
                         className="w-full hover:bg-primary/10 hover:text-primary"
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
                   </TooltipTrigger>
                   {finalizationCheck.reason && (
                     <TooltipContent>
                       <p>{finalizationCheck.reason}</p>
                     </TooltipContent>
                   )}
                 </Tooltip>
               </TooltipProvider>
             </div>
        </div>
    </div>
  );
}