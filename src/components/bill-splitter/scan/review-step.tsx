"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ExpenseCalculationService } from "@/services/expense-calculations";
import { ExpensePayloadService } from "@/services/expense-payload";
import { SplitwiseService } from "@/services/splitwise";
import type { ExtractReceiptDataOutput, FinalSplit, ItemSplit, SplitwiseUser } from "@/types";
import { AlertTriangle, ArrowLeft, Bot, Edit, Loader2, Send, UserCircle } from "lucide-react";
import * as React from "react";

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
  updatedBillData?: ExtractReceiptDataOutput; // New optional prop for edited data
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

// Helper function to format a date string or Date object to "YYYY-MM-DD"
  const formatToLocalDateString = (dateInput: string | Date): string => {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return dateInput;
    }
    const date = new Date(dateInput);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() + userTimezoneOffset);
    const year = localDate.getFullYear();
    const month = (localDate.getMonth() + 1).toString().padStart(2, '0');
    const day = (localDate.getDate() + 1).toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatCurrency = (amount: number | undefined) => {
     if (amount === undefined) return '-';
     const value = (typeof amount === 'number' && !isNaN(amount)) ? amount : 0;
     return ExpenseCalculationService.formatCurrency(value);
  };

   // Calculate final splits whenever relevant props change
  React.useEffect(() => {
      const calculateSplits = (): FinalSplit[] => {
          return ExpenseCalculationService.calculateFinalSplits(
              activeBillData,
              itemSplits,
              selectedMembers,
              taxSplitMembers,
              otherChargesSplitMembers
          );
      };

      const generateNotes = (): string => {
          return ExpensePayloadService.generateExpenseNotes(activeBillData, storeName, date);
      };

      setFinalSplits(calculateSplits());
      setExpenseNotes(generateNotes());

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
       if (!groupIdStr) throw new Error("Group ID not found for payer or any member.");
       const groupId = parseInt(groupIdStr);

       const totalCostForPayload = activeBillData.totalCost;

       const expensePayload = ExpensePayloadService.generateExpensePayload(
         finalSplits,
         totalCostForPayload,
         {
           storeName,
           date,
           expenseNotes,
           payerId,
           groupId
         }
       );

       // Final validation
       const validation = ExpensePayloadService.validateExpensePayload(expensePayload, totalCostForPayload);
       if (!validation.isValid) {
         console.error("Final Validation Error:", { expensePayload });
         throw new Error(validation.error || "Validation failed");
       }

       console.log("Expense Payload :", JSON.stringify(expensePayload, null, 2));
       const result = await SplitwiseService.createExpense(expensePayload);

       // Check for API errors in the response - only check if result exists and has errors property
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

       // If we get here, the expense was created successfully
       toast({
           title: "Expense Created Successfully",
           description: `Expense for ${storeName} has been added to Splitwise.`,
           variant: "default",
       });
       onFinalize();

    } catch (error: any) {
       console.error("Error finalizing expense:", error);
       toast({
         title: "Finalization Failed",
         description: error.message || "Could not save expense. Try again.",
         variant: "destructive",
       });
    } finally {
      onLoadingChange(false);
    }
  };

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
             {!totalMatches && !isLoading && (
                 <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive mx-1">
                   <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                   <span><strong>Calculation Warning:</strong> Final split total ({formatCurrency(calculatedTotalFromSplits)}) doesn't exactly match bill total ({formatCurrency(billTotalForComparison)}). Check splits if difference is large.</span>
                 </div>
             )}

            {/* Summary Card */}
            <Card className="card-modern">
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
                  <div className="flex justify-between text-muted-foreground"><span>Items Subtotal:</span> <strong className="text-foreground">{formatCurrency(activeBillData.items.reduce((s: number, i: any) => s + i.price, 0))}</strong></div>
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
            <Card className="card-modern">
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
            <Card className="card-modern">
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
             <Card className="card-modern">
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
                         disabled={isFinalizeDisabled}
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
                   {finalizeDisabledReason && (
                     <TooltipContent>
                       <p>{finalizeDisabledReason}</p>
                     </TooltipContent>
                   )}
                 </Tooltip>
               </TooltipProvider>
             </div>
        </div>
    </div>
  );
}
