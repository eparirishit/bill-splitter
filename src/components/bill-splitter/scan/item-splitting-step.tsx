"use client";

import * as React from "react";
import { Users, UserCheck, ArrowRight, Loader2, ArrowLeft, AlertTriangle, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import type { ExtractReceiptDataOutput, SplitwiseUser, ItemSplit } from "@/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditablePrice } from "@/components/ui/editable-price";
import { MemberSelectionList } from "@/components/ui/member-selection-list";
import { formatCurrency } from "@/lib/currency";
import { getCardStyle, getAlertStyle } from "@/lib/design-system";
import { ValidationService } from "@/services/validation-service";

interface ItemSplittingStepProps {
  billData: ExtractReceiptDataOutput;
  selectedMembers: SplitwiseUser[];
  onSplitsDefined: (itemSplits: ItemSplit[], taxSplit: string[], otherChargesSplit: string[], updatedBillData?: ExtractReceiptDataOutput) => void;
  onLoadingChange: (isLoading: boolean) => void;
  isLoading: boolean;
  onBack: () => void;
}

type SplitType = 'equal' | 'custom';

interface ItemSplitState extends ItemSplit {
  splitType: SplitType;
}

export function ItemSplittingStep({
  billData,
  selectedMembers,
  onSplitsDefined,
  onLoadingChange,
  isLoading,
  onBack
}: ItemSplittingStepProps) {
  const { toast } = useToast();
  const memberIds = React.useMemo(() => selectedMembers.map(m => m.id), [selectedMembers]);

  // State for edited bill data
  const [editedBillData, setEditedBillData] = React.useState<ExtractReceiptDataOutput>(billData);
  const [hasManualEdits, setHasManualEdits] = React.useState(false);

  // Initialize item splits state
  const initialItemSplits: ItemSplitState[] = React.useMemo(() =>
    editedBillData.items.map((item, index) => ({
      itemId: `item-${index}`,
      splitType: 'equal',
      sharedBy: memberIds,
    })), [editedBillData.items, memberIds]
  );

  const [itemSplits, setItemSplits] = React.useState<ItemSplitState[]>(initialItemSplits);
  const [taxSplitMembers, setTaxSplitMembers] = React.useState<string[]>(memberIds);
  const [otherChargesSplitMembers, setOtherChargesSplitMembers] = React.useState<string[]>(memberIds);

  // Reset splits if members or items change
  React.useEffect(() => {
    setItemSplits(initialItemSplits);
    setTaxSplitMembers(memberIds);
    setOtherChargesSplitMembers(memberIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedBillData.items, memberIds.join(",")]);

  const recalculateDiscrepancy = React.useCallback((updatedItems: typeof editedBillData.items, taxes: number, otherCharges: number) => {
    const itemsSum = updatedItems.reduce((sum, item) => sum + item.price, 0);
    const discount = editedBillData.discount ?? 0;
    const calculatedTotal = itemsSum + taxes + otherCharges - discount;
    const difference = Math.abs(calculatedTotal - editedBillData.totalCost);

    const discrepancyFlag = difference > 0.02;
    const discrepancyMessage = discrepancyFlag
      ? `Receipt total ($${editedBillData.totalCost.toFixed(2)}) differs from calculated total ($${calculatedTotal.toFixed(2)}) by $${difference.toFixed(2)}. This may indicate missing items, fees, or rounding differences.`
      : undefined;

    return { discrepancyFlag, discrepancyMessage };
  }, [editedBillData.totalCost, editedBillData.discount]);

  const handleItemPriceChange = (itemIndex: number, newPrice: number) => {
    setEditedBillData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], price: newPrice };

      const { discrepancyFlag, discrepancyMessage } = recalculateDiscrepancy(
        updatedItems,
        prev.taxes ?? 0,
        prev.otherCharges ?? 0
      );

      return {
        ...prev,
        items: updatedItems,
        discrepancyFlag,
        discrepancyMessage
      };
    });

    setHasManualEdits(true);
  };

  const handleTaxChange = (newTax: number) => {
    setEditedBillData(prev => {
      const { discrepancyFlag, discrepancyMessage } = recalculateDiscrepancy(
        prev.items,
        newTax,
        prev.otherCharges ?? 0
      );

      return {
        ...prev,
        taxes: newTax,
        discrepancyFlag,
        discrepancyMessage
      };
    });

    setHasManualEdits(true);
  };

  const handleOtherChargesChange = (newCharges: number) => {
    setEditedBillData(prev => {
      const { discrepancyFlag, discrepancyMessage } = recalculateDiscrepancy(
        prev.items,
        prev.taxes ?? 0,
        newCharges
      );

      return {
        ...prev,
        otherCharges: newCharges,
        discrepancyFlag,
        discrepancyMessage
      };
    });

    setHasManualEdits(true);
  };

  // Handle split type change
  const handleSplitTypeChange = (itemId: string, type: SplitType | null) => {
    if (type === null) {return;}
    setItemSplits(prev =>
      prev.map(split =>
        split.itemId === itemId
          ? {
            ...split,
            splitType: type,
            sharedBy: type === 'equal' ? memberIds : []
          }
          : split
      )
    );
  };

  // Handle member selection for custom splits
  const handleMemberSelectionChange = (itemId: string, memberId: string) => {
    setItemSplits(prev =>
      prev.map(split => {
        if (split.itemId === itemId && split.splitType === 'custom') {
          const updatedSharedBy = split.sharedBy.includes(memberId)
            ? split.sharedBy.filter(id => id !== memberId)
            : [...split.sharedBy, memberId];
          return { ...split, sharedBy: updatedSharedBy };
        }
        return split;
      })
    );
  };

  // Handle member selection for tax/other charges
  const handleChargeMemberSelection = (chargeType: 'tax' | 'other', memberId: string) => {
    if (chargeType === 'tax') {
      setTaxSplitMembers(prev =>
        prev.includes(memberId)
          ? prev.filter(id => id !== memberId)
          : [...prev, memberId]
      );
    } else {
      setOtherChargesSplitMembers(prev =>
        prev.includes(memberId)
          ? prev.filter(id => id !== memberId)
          : [...prev, memberId]
      );
    }
  };

  const handleProceedToReview = () => {
    onLoadingChange(true);

    // Use validation service
    const validation = ValidationService.validateReceiptSplits(
      editedBillData,
      itemSplits,
      taxSplitMembers,
      otherChargesSplitMembers
    );

    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast({
          title: "Incomplete Split",
          description: error,
          variant: "destructive",
        });
      });
      onLoadingChange(false);
      return;
    }

    const finalItemSplits: ItemSplit[] = itemSplits.map(({ itemId, sharedBy, splitType }) => ({
      itemId,
      sharedBy: splitType === 'equal' ? memberIds : sharedBy,
      splitType
    }));

    const finalTaxSplitMembers = (typeof editedBillData.taxes === 'number' && editedBillData.taxes > 0) ? taxSplitMembers : [];
    const finalOtherChargesSplitMembers = (typeof editedBillData.otherCharges === 'number' && editedBillData.otherCharges > 0) ? otherChargesSplitMembers : [];

    onSplitsDefined(finalItemSplits, finalTaxSplitMembers, finalOtherChargesSplitMembers, hasManualEdits ? editedBillData : undefined);
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-fade-in pt-2">
      <div className="px-1">
        <h2 className="text-2xl font-semibold mb-1">Split Items & Charges</h2>
        <p className="text-muted-foreground text-sm">How should each item be divided?</p>
      </div>

      {/* AI Warning */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400 mx-1">
        <Bot className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">AI-Extracted Data</p>
          <p className="text-xs mt-1">This information was extracted using AI and may contain errors. Please review and edit prices if needed.</p>
        </div>
      </div>

      {/* Discrepancy Alert */}
      {editedBillData.discrepancyFlag && (
        <div className="flex items-start gap-2 rounded-lg border border-orange-500/50 bg-orange-500/10 p-3 text-sm text-orange-700 dark:text-orange-400 mx-1">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span><strong>Bill Discrepancy:</strong> {editedBillData.discrepancyMessage}</span>
        </div>
      )}

      <div className="flex-grow space-y-4 overflow-y-auto pb-24">
        <Accordion type="multiple" className="w-full space-y-3">
          {editedBillData.items.map((item, index) => {
            const itemId = `item-${index}`;
            const currentSplit = itemSplits.find(s => s.itemId === itemId);

            return (
              <AccordionItem value={itemId} key={itemId} className={getCardStyle('modern')}>
                <AccordionTrigger className="text-sm px-4 py-3 hover:bg-muted/50 transition-colors [&[data-state=open]]:bg-muted/50">
                  <div className="flex justify-between w-full items-start gap-3">
                    <span className="font-medium text-foreground flex-1 text-left leading-tight">{item.name}</span>
                    <EditablePrice
                      value={item.price}
                      onValueChange={(newPrice) => handleItemPriceChange(index, newPrice)}
                      disabled={isLoading}
                    />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 p-4 bg-background border-t">
                  <ToggleGroup
                    type="single"
                    value={currentSplit?.splitType ?? "equal"}
                    onValueChange={(value) => handleSplitTypeChange(itemId, value as SplitType | null)}
                    className="grid grid-cols-2 gap-3"
                    aria-label={`Split type for ${item.name}`}
                    disabled={isLoading}
                  >
                    <ToggleGroupItem
                      value="equal"
                      aria-label="Split equally"
                      className="flex flex-col items-center justify-center h-auto p-3 rounded-lg border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary data-[state=on]:shadow-md tap-scale"
                    >
                      <Users className="h-5 w-5 mb-1" />
                      <span className="text-xs font-medium">Equally</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="custom"
                      aria-label="Split custom"
                      className="flex flex-col items-center justify-center h-auto p-3 rounded-lg border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary data-[state=on]:shadow-md tap-scale"
                    >
                      <UserCheck className="h-5 w-5 mb-1" />
                      <span className="text-xs font-medium">Custom</span>
                    </ToggleGroupItem>
                  </ToggleGroup>

                  {currentSplit?.splitType === 'custom' && (
                    <div className="space-y-2 pt-2 flex flex-col">
                      <Label className="text-xs font-medium text-muted-foreground block mb-1.5">Select who shared this item:</Label>
                      <MemberSelectionList
                        members={selectedMembers}
                        selectedIds={currentSplit.sharedBy}
                        onSelect={(memberId) => handleMemberSelectionChange(itemId, memberId)}
                        disabled={isLoading}
                        listHeight="max-h-40"
                        itemIdPrefix={`item-${itemId}`}
                      />
                      {currentSplit.sharedBy.length === 0 && (
                        <p className="text-xs text-destructive pt-1">Select at least one member.</p>
                      )}
                    </div>
                  )}
                  {currentSplit?.splitType === 'equal' && (
                    <p className="text-xs text-muted-foreground text-center pt-2">Item will be split equally among all {selectedMembers.length} members.</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Tax Section */}
        {(typeof editedBillData.taxes === 'number' && editedBillData.taxes > 0) && (
          <Card className={getCardStyle('modern')}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Tax</CardTitle>
              <EditablePrice
                value={editedBillData.taxes}
                onValueChange={handleTaxChange}
                disabled={isLoading}
              />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-3">Select members to split tax equally.</p>
              <MemberSelectionList
                members={selectedMembers}
                selectedIds={taxSplitMembers}
                onSelect={(memberId) => handleChargeMemberSelection('tax', memberId)}
                disabled={isLoading}
                itemIdPrefix="tax-split"
                listHeight="max-h-40"
              />
              {taxSplitMembers.length === 0 && (
                <p className="text-xs text-destructive pt-2">Select at least one member.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Other Charges Section */}
        {(typeof editedBillData.otherCharges === 'number' && editedBillData.otherCharges > 0) && (
          <Card className={getCardStyle('modern')}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Other Charges</CardTitle>
              <EditablePrice
                value={editedBillData.otherCharges}
                onValueChange={handleOtherChargesChange}
                disabled={isLoading}
              />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-3">Select members to split charges equally.</p>
              <MemberSelectionList
                members={selectedMembers}
                selectedIds={otherChargesSplitMembers}
                onSelect={(memberId) => handleChargeMemberSelection('other', memberId)}
                disabled={isLoading}
                itemIdPrefix="other-split"
                listHeight="max-h-40"
              />
              {otherChargesSplitMembers.length === 0 && (
                <p className="text-xs text-destructive pt-2">Select at least one member.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Discount Section */}
        {(typeof editedBillData.discount === 'number' && editedBillData.discount > 0) && (
          <Card className={getCardStyle('modern')}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Discount</CardTitle>
              <span className="font-semibold text-green-600">-{formatCurrency(editedBillData.discount)}</span>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground">
                A discount of {formatCurrency(editedBillData.discount)} will be applied to the total.
              </p>
            </CardContent>
          </Card>
        )}

      </div>

      <div className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto p-4 bg-background border-t border-border z-10">
        <div className="flex gap-3">
          <Button onClick={onBack} variant="outline" disabled={isLoading} className="w-1/3 hover:bg-primary/10 hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={handleProceedToReview} disabled={isLoading} className="w-2/3 hover:bg-primary/10 hover:text-primary">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Next: Review
          </Button>
        </div>
      </div>
    </div>
  );
}
