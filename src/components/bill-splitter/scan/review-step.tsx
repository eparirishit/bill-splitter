"use client";

import * as React from "react";
import { AlertTriangle, Send, Loader2, Edit, ArrowLeft, UserCircle, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { createExpense } from "@/services/splitwise";
import type { ExtractReceiptDataOutput, SplitwiseUser, ItemSplit, FinalSplit, CreateExpense } from "@/types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency";
import { getCardStyle, getAlertStyle } from "@/lib/design-system";
import { isAPIError, getErrorMessage, isSuccessfulResponse } from "@/types/api";

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

   // Calculate final splits whenever relevant props change
  React.useEffect(() => {
      const calculateSplits = (): FinalSplit[] => {
          const memberGrossTotals: Record<string, number> = selectedMembers.reduce((acc, member) => {
              acc[member.id] = 0;
              return acc;
          }, {} as Record<string, number>);

          // Calculate gross share for each member using activeBillData
          activeBillData.items.forEach((item, index) => {
              const itemId = `item-${index}`;
              const splitInfo = itemSplits.find(s => s.itemId === itemId);
              if (!splitInfo || splitInfo.sharedBy.length === 0) return;
              const costPerMember = item.price / splitInfo.sharedBy.length;
              splitInfo.sharedBy.forEach(memberId => {
                  if (memberGrossTotals[memberId] !== undefined) {
                      memberGrossTotals[memberId] += costPerMember;
                  }
              });
          });

          if ((activeBillData.taxes ?? 0) > 0 && taxSplitMembers.length > 0) {
              const taxPerMember = (activeBillData.taxes ?? 0) / taxSplitMembers.length;
              taxSplitMembers.forEach(memberId => {
                 if (memberGrossTotals[memberId] !== undefined) {
                    memberGrossTotals[memberId] += taxPerMember;
                 }
              });
          }

          if ((activeBillData.otherCharges ?? 0) > 0 && otherChargesSplitMembers.length > 0) {
              const chargePerMember = (activeBillData.otherCharges ?? 0) / otherChargesSplitMembers.length;
              otherChargesSplitMembers.forEach(memberId => {
                 if (memberGrossTotals[memberId] !== undefined) {
                    memberGrossTotals[memberId] += chargePerMember;
                 }
              });
          }

          const overallGrossTotal = Object.values(memberGrossTotals).reduce((sum, val) => sum + val, 0);
          const targetTotal = activeBillData.totalCost;
          let finalMemberShares: Record<string, number> = {};

          if (overallGrossTotal === 0) {
              if (targetTotal !== 0 && selectedMembers.length > 0) {
                  const amountPerMember = targetTotal / selectedMembers.length;
                  selectedMembers.forEach(member => {
                      finalMemberShares[member.id] = amountPerMember;
                  });
              } else {
                  selectedMembers.forEach(member => {
                      finalMemberShares[member.id] = 0;
                  });
              }
          } else {
              selectedMembers.forEach(member => {
                  const proportion = (memberGrossTotals[member.id] ?? 0) / overallGrossTotal;
                  finalMemberShares[member.id] = proportion * targetTotal;
              });
          }
          
          // Round shares and distribute pennies
          let roundedMemberShares: Record<string, number> = {};
          let sumOfRoundedShares = 0;
          selectedMembers.forEach(member => {
              const roundedShare = Math.round((finalMemberShares[member.id] ?? 0) * 100) / 100;
              roundedMemberShares[member.id] = roundedShare;
              sumOfRoundedShares += roundedShare;
          });

          let discrepancy = parseFloat((targetTotal - sumOfRoundedShares).toFixed(2));
          
          if (Math.abs(discrepancy) > 0.005 && selectedMembers.length > 0) {
              const memberIdsToAdjust = selectedMembers
                  .map(m => m.id)
                  .sort((a, b) => (roundedMemberShares[b] ?? 0) - (roundedMemberShares[a] ?? 0)); 

              let remainingDiscrepancyCents = Math.round(discrepancy * 100);
              let i = 0;
              while (remainingDiscrepancyCents !== 0 && i < memberIdsToAdjust.length * 2) {
                  const memberId = memberIdsToAdjust[i % memberIdsToAdjust.length];
                  const adjustment = remainingDiscrepancyCents > 0 ? 0.01 : -0.01;
                  roundedMemberShares[memberId] = parseFloat(((roundedMemberShares[memberId] ?? 0) + adjustment).toFixed(2));
                  remainingDiscrepancyCents -= Math.round(adjustment * 100);
                  i++;
              }
              if (remainingDiscrepancyCents !== 0 && memberIdsToAdjust.length > 0) {
                  const firstMemberId = memberIdsToAdjust[0];
                  roundedMemberShares[firstMemberId] = parseFloat(((roundedMemberShares[firstMemberId] ?? 0) + (remainingDiscrepancyCents / 100)).toFixed(2));
              }
          }

          return selectedMembers.map(member => ({
              userId: member.id,
              amountOwed: roundedMemberShares[member.id] !== undefined ? roundedMemberShares[member.id] : 0,
          }));
      };

      const generateNotes = (): string => {
          const subtotal = activeBillData.items.reduce((sum, item) => sum + item.price, 0);
          let notes = `Store: ${storeName}\nDate: ${formatToLocalDateString(date)}\n\nItems Subtotal: ${formatCurrency(subtotal)}\n`;
          
          activeBillData.items.forEach(item => {
              notes += `- ${item.name}: ${formatCurrency(item.price)}\n`;
          });

          if ((activeBillData.taxes ?? 0) > 0) {
              notes += `Tax: ${formatCurrency(activeBillData.taxes ?? 0)}\n`;
          }
           if ((activeBillData.otherCharges ?? 0) > 0) {
              notes += `Other Charges: ${formatCurrency(activeBillData.otherCharges ?? 0)}\n`;
          }
           if ((activeBillData.discount ?? 0) > 0) {
              notes += `Discount Applied: -${formatCurrency(activeBillData.discount ?? 0)}\n`;
          }
          notes += `\nGrand Total (on receipt): ${formatCurrency(activeBillData.totalCost)}`;
          if (activeBillData.discrepancyFlag) {
              notes += `\n\nNote: Original bill data discrepancy: ${activeBillData.discrepancyMessage}`;
          }
          return notes;
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

       const numericPayerId = parseInt(payerId);
       const totalCostForPayload = activeBillData.totalCost;

       // Adjust final splits to ensure exact total match
       const adjustedSplits = [...finalSplits];
       let totalOwedSoFar = 0;
       
       // Calculate all but the last split normally
       for (let i = 0; i < adjustedSplits.length - 1; i++) {
         adjustedSplits[i].amountOwed = Math.round(adjustedSplits[i].amountOwed * 100) / 100;
         totalOwedSoFar += adjustedSplits[i].amountOwed;
       }
       
       // Last person gets the remainder to ensure exact total
       if (adjustedSplits.length > 0) {
         adjustedSplits[adjustedSplits.length - 1].amountOwed = totalCostForPayload - totalOwedSoFar;
       }

       const expensePayload: CreateExpense = {
           cost: totalCostForPayload.toFixed(2),
           description: storeName,
           group_id: groupId,
           date: formatToLocalDateString(date),
           details: expenseNotes,
           currency_code: 'USD',
           category_id: 18,
           split_equally: false,
       };

       adjustedSplits.forEach((split, index) => {
           const paidShare = parseInt(split.userId) === numericPayerId ? totalCostForPayload.toFixed(2) : '0.00';
           const owedShare = split.amountOwed.toFixed(2);
           
           expensePayload[`users__${index}__user_id`] = parseInt(split.userId);
           expensePayload[`users__${index}__paid_share`] = paidShare;
           expensePayload[`users__${index}__owed_share`] = owedShare;
       });

       // Final validation
       const totalOwed = parseFloat(adjustedSplits.reduce((sum, split) => sum + split.amountOwed, 0).toFixed(2));
       if (Math.abs(totalOwed - totalCostForPayload) > 0.005) {
           console.error("Final Validation Error:", { totalOwed, totalCostForPayload, expensePayload });
           throw new Error(`Validation Error: Split total (${formatCurrency(totalOwed)}) doesn't match bill total (${formatCurrency(totalCostForPayload)}).`);
       }

       console.log("Expense Payload :", JSON.stringify(expensePayload, null, 2));
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

       // If we get here, the expense was created successfully
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
                 <div className="flex items-start gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400 mx-1">
                   <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                   <span><strong>Calculation Warning:</strong> Final split total ({formatCurrency(calculatedTotalFromSplits)}) doesn't exactly match bill total ({formatCurrency(billTotalForComparison)}). Check splits if difference is large.</span>
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
