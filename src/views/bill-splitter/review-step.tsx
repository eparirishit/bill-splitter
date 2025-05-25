"use client";

import * as React from "react";
import { CheckCircle, AlertTriangle, Send, Loader2, Edit, ArrowLeft, UserCircle } from "lucide-react"; // Added UserCircle
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { createExpense } from "@/services/splitwise"; // Import the actual API function
import type { ExtractReceiptDataOutput, SplitwiseUser, ItemSplit, FinalSplit, CreateExpense } from "@/types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// Assuming you have these Select components from shadcn/ui
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";


interface ReviewStepProps {
  billData: ExtractReceiptDataOutput;
  selectedMembers: SplitwiseUser[];
  itemSplits: ItemSplit[];
  taxSplitMembers: string[];
  otherChargesSplitMembers: string[];
  onFinalize: () => void;
  onEdit: (step: number) => void; // Function to go back to a specific step
  onLoadingChange: (isLoading: boolean) => void;
  isLoading: boolean;
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
  isLoading
}: ReviewStepProps) {
  const { toast } = useToast();
  const [finalSplits, setFinalSplits] = React.useState<FinalSplit[]>([]);
  const [expenseNotes, setExpenseNotes] = React.useState<string>("");
  const [payerId, setPayerId] = React.useState<string | undefined>(undefined);

  const memberMap = React.useMemo(() => {
    return selectedMembers.reduce((acc, member) => {
      acc[member.id] = member;
      return acc;
    }, {} as Record<string, SplitwiseUser>);
  }, [selectedMembers]);

  React.useEffect(() => {
    // Initialize payerId
    // const loggedInUserId = getLoggedInUserId(); // Placeholder for auth context
    // if (loggedInUserId && selectedMembers.some(m => m.id === loggedInUserId)) {
    //   setPayerId(loggedInUserId);
    // } else 
    if (selectedMembers.length > 0 && !payerId) { // Set initial payer only if not already set
      setPayerId(selectedMembers[0].id);
    }
  }, [selectedMembers, payerId]); // Added payerId to dependencies to prevent re-running if already set by user

    // Helper function to format a date string or Date object to "YYYY-MM-DD"
  const formatToLocalDateString = (dateInput: string | Date): string => {
    // If dateInput is already "YYYY-MM-DD", new Date() parses it as UTC midnight.
    // To avoid timezone shifts when extracting day/month/year, parse carefully or use as is if format is guaranteed.
    // Assuming dateInput from billData.date is "YYYY-MM-DD" string.
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        // If it's already in the correct format, and we trust it represents the intended local date.
        return dateInput;
    }
    const date = new Date(dateInput);
    // Adjust for timezone offset to get "local" date parts if new Date() parsed as UTC
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() + userTimezoneOffset);
    
    // Fallback for Date objects or other string formats - attempt to format
    const year = localDate.getFullYear();
    const month = (localDate.getMonth() + 1).toString().padStart(2, '0');
    const day = (localDate.getDate() + 1).toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Function to format currency
  const formatCurrency = (amount: number | undefined) => {
     if (amount === undefined) return '-';
     // Ensure taxes and other charges are included if they exist and are non-zero
     const value = (typeof amount === 'number' && !isNaN(amount)) ? amount : 0;
     return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

   // Calculate final splits whenever relevant props change
  React.useEffect(() => {
      const calculateSplits = (): FinalSplit[] => {
          const memberGrossTotals: Record<string, number> = selectedMembers.reduce((acc, member) => {
              acc[member.id] = 0;
              return acc;
          }, {} as Record<string, number>);

          // 1. Calculate gross share for each member (sum of their parts of items, taxes, other charges)
          billData.items.forEach((item, index) => {
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

          if (billData.taxes !== undefined && billData.taxes > 0 && taxSplitMembers.length > 0) {
              const taxPerMember = billData.taxes / taxSplitMembers.length;
              taxSplitMembers.forEach(memberId => {
                 if (memberGrossTotals[memberId] !== undefined) {
                    memberGrossTotals[memberId] += taxPerMember;
                 }
              });
          }

          if (billData.otherCharges !== undefined && billData.otherCharges > 0 && otherChargesSplitMembers.length > 0) {
              const chargePerMember = billData.otherCharges / otherChargesSplitMembers.length;
              otherChargesSplitMembers.forEach(memberId => {
                 if (memberGrossTotals[memberId] !== undefined) {
                    memberGrossTotals[memberId] += chargePerMember;
                 }
              });
          }

          // 2. Calculate overall gross total
          const overallGrossTotal = Object.values(memberGrossTotals).reduce((sum, val) => sum + val, 0);

          // Target total is billData.totalCost (which should be net of discount)
          const targetTotal = billData.totalCost;

          let finalMemberShares: Record<string, number> = {};

          if (overallGrossTotal === 0) { // Handle case where no items/charges are split or sum to zero
              if (targetTotal !== 0 && selectedMembers.length > 0) { // If there's a bill total but no one shared items/tax/charges
                  // Distribute targetTotal equally among all selected members as a fallback
                  const amountPerMember = targetTotal / selectedMembers.length;
                  selectedMembers.forEach(member => {
                      finalMemberShares[member.id] = amountPerMember;
                  });
              } else { // If target is also 0, or no members, shares are 0
                  selectedMembers.forEach(member => {
                      finalMemberShares[member.id] = 0;
                  });
              }
          } else {
              // 3. Calculate final share for each member based on their proportion of gross total, applied to targetTotal
              selectedMembers.forEach(member => {
                  const proportion = (memberGrossTotals[member.id] ?? 0) / overallGrossTotal;
                  finalMemberShares[member.id] = proportion * targetTotal;
              });
          }
          
          // 4. Round shares and distribute pennies to match targetTotal
          let roundedMemberShares: Record<string, number> = {};
          let sumOfRoundedShares = 0;
          selectedMembers.forEach(member => {
              const roundedShare = Math.round((finalMemberShares[member.id] ?? 0) * 100) / 100;
              roundedMemberShares[member.id] = roundedShare;
              sumOfRoundedShares += roundedShare;
          });

          let discrepancy = parseFloat((targetTotal - sumOfRoundedShares).toFixed(2));
          
          // Distribute discrepancy (pennies)
          if (Math.abs(discrepancy) > 0.005 && selectedMembers.length > 0) {
              const memberIdsToAdjust = selectedMembers
                  .map(m => m.id)
                  // Prioritize members with larger shares or simply cycle through
                  .sort((a, b) => (roundedMemberShares[b] ?? 0) - (roundedMemberShares[a] ?? 0)); 

              let remainingDiscrepancyCents = Math.round(discrepancy * 100);
              let i = 0;
              while (remainingDiscrepancyCents !== 0 && i < memberIdsToAdjust.length * 2) { // Safety break
                  const memberId = memberIdsToAdjust[i % memberIdsToAdjust.length];
                  const adjustment = remainingDiscrepancyCents > 0 ? 0.01 : -0.01;
                  roundedMemberShares[memberId] = parseFloat(((roundedMemberShares[memberId] ?? 0) + adjustment).toFixed(2));
                  remainingDiscrepancyCents -= Math.round(adjustment * 100);
                  i++;
              }
              // If discrepancy still exists, assign to the first member (rare)
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
          const subtotal = billData.items.reduce((sum, item) => sum + item.price, 0);
          let notes = `Store: ${billData.storeName}\nDate: ${formatToLocalDateString(billData.date)}\n\nItems Subtotal: ${formatCurrency(subtotal)}\n`;
          
          billData.items.forEach(item => { // List items for clarity, though subtotal is main
              notes += `- ${item.name}: ${formatCurrency(item.price)}\n`;
          });

          if (billData.taxes !== undefined && billData.taxes > 0) {
              notes += `Tax: ${formatCurrency(billData.taxes)}\n`;
          }
           if (billData.otherCharges !== undefined && billData.otherCharges > 0) {
              notes += `Other Charges: ${formatCurrency(billData.otherCharges)}\n`;
          }
           if (billData.discount !== undefined && billData.discount > 0) {
              notes += `Discount Applied: -${formatCurrency(billData.discount)}\n`;
          }
          notes += `\nGrand Total (on receipt): ${formatCurrency(billData.totalCost)}`; // This is the key total
          if (billData.discrepancyFlag) {
              notes += `\n\nNote: Original bill data discrepancy: ${billData.discrepancyMessage}`;
          }
          return notes;
      };


      setFinalSplits(calculateSplits());
      setExpenseNotes(generateNotes());

  }, [billData, itemSplits, selectedMembers, taxSplitMembers, otherChargesSplitMembers]); // Recalculate when these change


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

       // The total cost for the expense payload is billData.totalCost (net amount from receipt)
       const totalCostForPayload = billData.totalCost;

       const expensePayload: CreateExpense = {
           cost: totalCostForPayload,
           description: billData.storeName,
           group_id: groupId,
           date: formatToLocalDateString(billData.date), // Ensure date format matches YYYY-MM-DD if needed by Splitwise
           users: finalSplits.map(split => ({
               user_id: parseInt(split.userId),
               paid_share: parseInt(split.userId) === numericPayerId ? totalCostForPayload : 0.00,
               owed_share: parseFloat(split.amountOwed.toFixed(2)),
           })),
           details: expenseNotes,
           payment: false,
           category_id: 18, // Groceries
           split_equally: false,
       };

       // Final Validation: Sum of owed shares must exactly match total cost
       const totalOwed = parseFloat(expensePayload.users.reduce((sum: any, user: { owed_share: any; }) => sum + user.owed_share, 0).toFixed(2));

       if (Math.abs(totalOwed - totalCostForPayload) > 0.01) { // Allow for tiny floating point differences
           console.error("Final Validation Error:", { totalOwed, totalCostForPayload, expensePayload });
           throw new Error(`Validation Error: Split total (${formatCurrency(totalOwed)}) doesn't match bill total (${formatCurrency(totalCostForPayload)}).`);
       }

       // --- Actual API Call ---
       await createExpense(expensePayload); // Use the imported API function
       console.log("Expense Payload :", JSON.stringify(expensePayload, null, 2));
       // await new Promise(resolve => setTimeout(resolve, 1500)); // Remove Simulate API call
       // ----------------------

       toast({
           title: "Expense Created Successfully",
           description: `Expense for ${billData.storeName} has been added to Splitwise.`,
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

  // Calculate total based on billData.totalCost (net amount from receipt)
  const billTotalForComparison = billData.totalCost;
  const calculatedTotalFromSplits = parseFloat(finalSplits.reduce((sum, split) => sum + split.amountOwed, 0).toFixed(2));
  // Use a small tolerance for floating point comparisons
  const totalMatches = Math.abs(calculatedTotalFromSplits - billTotalForComparison) < 0.015; // Allow tolerance up to 1.5 cents

  const isFinalizeDisabled = isLoading || !totalMatches || billData.discrepancyFlag || !payerId;
  const finalizeDisabledReason = billData.discrepancyFlag
                                  ? "Cannot finalize due to original bill discrepancy."
                                  : !totalMatches
                                  ? "Cannot finalize due to calculation mismatch."
                                  : !payerId
                                  ? "Please select who paid the bill."
                                  : undefined;


  return (
    <div className="flex flex-col h-full space-y-6 animate-fade-in pt-2">
        {/* Step Title */}
        <div className="px-1">
           <h2 className="text-2xl font-semibold mb-1">Review & Finalize</h2>
           <p className="text-muted-foreground text-sm">Confirm the details before adding to Splitwise.</p>
        </div>

        {/* Scrollable Content Area - Added padding-bottom */}
        <div className="flex-grow space-y-4 overflow-y-auto pb-24"> {/* Add padding-bottom for button */}

            {/* Discrepancy Alerts */}
            {billData.discrepancyFlag && (
               <div className="flex items-start gap-2 rounded-lg border border-orange-500/50 bg-orange-500/10 p-3 text-sm text-orange-700 dark:text-orange-400 mx-1">
                 <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                 <span><strong>Bill Discrepancy:</strong> {billData.discrepancyMessage || 'Item total vs bill total mismatch found in original data.'}</span>
               </div>
            )}
             {!totalMatches && !isLoading && ( // Show only if not loading and totals don't match (within tolerance)
                 <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive mx-1">
                   <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                   <span><strong>Calculation Warning:</strong> Final split total ({formatCurrency(calculatedTotalFromSplits)}) doesn't exactly match bill total ({formatCurrency(billTotalForComparison)}). Check splits if difference is large.</span>
                 </div>
             )}

            {/* Summary Card */}
            <Card className="card-modern">
              <CardHeader className="flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-medium">Expense Summary</CardTitle>
                <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-primary hover:bg-primary/10" onClick={() => onEdit(1)} disabled={isLoading}>
                      <Edit className="mr-1 h-3 w-3" /> Edit Bill
                </Button>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-muted-foreground">
                  <div className="flex justify-between"><span>Store:</span> <strong className="text-foreground">{billData.storeName}</strong></div>
                  <div className="flex justify-between"><span>Date:</span> <strong className="text-foreground">{formatToLocalDateString(billData.date)}</strong></div>
                  <div className="flex justify-between"><span>Items Subtotal:</span> <strong className="text-foreground">{formatCurrency(billData.items.reduce((s, i) => s + i.price, 0))}</strong></div>
                   {(billData.taxes !== undefined && billData.taxes > 0) && <div className="flex justify-between"><span>Tax:</span> <strong className="text-foreground">{formatCurrency(billData.taxes)}</strong></div>}
                   {(billData.otherCharges !== undefined && billData.otherCharges > 0) && <div className="flex justify-between"><span>Other Charges:</span> <strong className="text-foreground">{formatCurrency(billData.otherCharges)}</strong></div>}
                   {(billData.discount !== undefined && billData.discount > 0) && <div className="flex justify-between"><span>Discount:</span> <strong className="text-green-600">-{formatCurrency(billData.discount)}</strong></div>}
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
                      {selectedMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.first_name} {member.last_name || ''}
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
                  <ScrollArea className="max-h-60"> {/* Adjust max height as needed */}
                      <div className="space-y-1 pr-2">
                        {finalSplits.map(split => (
                          <div key={split.userId} className="flex justify-between items-center text-sm p-2.5 rounded-md hover:bg-muted/50">
                            <span className="text-foreground">{memberMap[split.userId]?.first_name || 'Unknown'} {memberMap[split.userId]?.last_name || ''}</span>
                            <span className="font-medium text-foreground">{formatCurrency(split.amountOwed)}</span>
                          </div>
                        ))}
                      </div>
                  </ScrollArea>
                   <p className="text-xs text-muted-foreground text-right pt-2 pr-1">Calculated Split Total: {formatCurrency(calculatedTotalFromSplits)}</p>
              </CardContent>
            </Card>


             {/* Notes Card */}
             <Card className="card-modern">
               <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium">Expense Notes</CardTitle>
                    <CardDescription className="text-xs">This will be added to the Splitwise expense details.</CardDescription>
                </CardHeader>
               <CardContent>
                    <ScrollArea className="h-28 rounded-md border bg-muted/30">
                     <pre className="text-xs whitespace-pre-wrap font-mono p-3">{expenseNotes}</pre>
                   </ScrollArea>
               </CardContent>
             </Card>
        </div>


        {/* Sticky Footer Buttons */}
        <div className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto p-4 bg-background border-t border-border z-10">
             <div className="flex gap-3">
                 <Button onClick={() => onEdit(3)} variant="outline" disabled={isLoading} className="w-1/3 hover:bg-primary/10 hover:text-primary">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Edit
                 </Button>
                 <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           {/* Wrap button in a span when disabled for Tooltip to work */}
                          <span tabIndex={isFinalizeDisabled ? 0 : -1}>
                            <Button
                                onClick={handleFinalizeExpense}
                                disabled={isFinalizeDisabled}
                                className="w-full tap-scale" // Use w-full within the span
                                aria-disabled={isFinalizeDisabled}
                              >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="mr-2 h-4 w-4" />
                                )}
                                Add to Splitwise
                              </Button>
                          </span>
                        </TooltipTrigger>
                         {isFinalizeDisabled && (
                             <TooltipContent>
                               <p>{finalizeDisabledReason}</p>
                             </TooltipContent>
                         )}
                    </Tooltip>
                 </TooltipProvider>

             </div>
             {isFinalizeDisabled && !isLoading && (
                 <p className="text-xs text-destructive text-center pt-2">{finalizeDisabledReason}</p>
             )}
        </div>
    </div>
  );
}
