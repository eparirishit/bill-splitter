"use client";

import * as React from "react";
import { Users, UserCheck, Check, ArrowRight, Loader2, ArrowLeft, AlertTriangle, Bot, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { ExtractReceiptDataOutput, SplitwiseUser, ItemSplit } from "@/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

const MemberListItemSelect = ({
    member,
    isSelected,
    onSelect,
    disabled,
    itemIdPrefix = 'member-item'
  }: {
    member: SplitwiseUser,
    isSelected: boolean,
    onSelect: (memberId: string) => void,
    disabled: boolean,
    itemIdPrefix?: string
}) => {
    const uniqueId = `${itemIdPrefix}-${member.id}`;
    return (
       <div
          key={member.id}
          onClick={() => !disabled && onSelect(member.id)}
          className={cn(
            "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors duration-150",
            "border border-transparent",
            isSelected ? "bg-primary/10 border-primary/30" : "hover:bg-muted/60",
            disabled ? "opacity-60 cursor-not-allowed" : "tap-scale"
          )}
          role="button"
          aria-pressed={isSelected}
          aria-labelledby={`${uniqueId}-label`}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => { if(e.key === ' ' || e.key === 'Enter') { !disabled && onSelect(member.id); e.preventDefault(); }}
          }
        >
           <Label id={`${uniqueId}-label`} className={cn("font-medium flex-grow cursor-pointer", isSelected ? "text-primary" : "text-foreground")}>
              {member.first_name} {member.last_name}
           </Label>
           {isSelected && <Check className="h-5 w-5 text-primary flex-shrink-0" />}
        </div>
    );
};

const MemberSelectionList = ({
    members,
    selectedIds,
    onSelect,
    disabled,
    listHeight = 'max-h-48',
    itemIdPrefix = 'member-list'
  }: {
    members: SplitwiseUser[],
    selectedIds: string[],
    onSelect: (memberId: string) => void,
    disabled: boolean,
    listHeight?: string,
    itemIdPrefix?: string
}) => (
     <ScrollArea className={cn("w-full scrollArea rounded-md border", listHeight)}>
        <div className="p-2 space-y-1.5">
          {members.map(member => (
            <MemberListItemSelect
              key={member.id}
              member={member}
              isSelected={selectedIds.includes(member.id)}
              onSelect={onSelect}
              disabled={disabled}
              itemIdPrefix={`${itemIdPrefix}-${member.id}`}
            />
          ))}
        </div>
    </ScrollArea>
);

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
  const [editingPrices, setEditingPrices] = React.useState<Record<number, string>>({});
  const [editingTax, setEditingTax] = React.useState<string | null>(null);
  const [editingOtherCharges, setEditingOtherCharges] = React.useState<string | null>(null);

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

  // Handle item price editing
  const handleItemPriceChange = (itemIndex: number, newPrice: string) => {
    const priceValue = parseFloat(newPrice);
    if (isNaN(priceValue) || priceValue < 0) return;

    setEditedBillData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], price: priceValue };
      
      // Recalculate discrepancy
      const itemsSum = updatedItems.reduce((sum, item) => sum + item.price, 0);
      const taxes = prev.taxes ?? 0;
      const otherCharges = prev.otherCharges ?? 0;
      const discount = prev.discount ?? 0;
      const calculatedTotal = itemsSum + taxes + otherCharges - discount;
      const difference = Math.abs(calculatedTotal - prev.totalCost);
      
      const discrepancyFlag = difference > 0.02;
      const discrepancyMessage = discrepancyFlag 
        ? `Receipt total ($${prev.totalCost.toFixed(2)}) differs from calculated total ($${calculatedTotal.toFixed(2)}) by $${difference.toFixed(2)}. This may indicate missing items, fees, or rounding differences.`
        : undefined;

      return {
        ...prev,
        items: updatedItems,
        discrepancyFlag,
        discrepancyMessage
      };
    });
    
    setHasManualEdits(true);
  };

  // Handle item price editing with text input behavior
  const handlePriceInputChange = (itemIndex: number, value: string) => {
    // Allow user to type freely, store the string value
    setEditingPrices(prev => ({ ...prev, [itemIndex]: value }));
  };

  const handlePriceInputBlur = (itemIndex: number, value: string) => {
    // When user finishes editing, validate and update the actual price
    const trimmedValue = value.replace(/[^0-9.]/g, ''); // Remove non-numeric characters except decimal
    const priceValue = parseFloat(trimmedValue);
    
    if (isNaN(priceValue) || priceValue < 0) {
      // Reset to original price if invalid
      setEditingPrices(prev => {
        const newState = { ...prev };
        delete newState[itemIndex];
        return newState;
      });
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than or equal to 0.",
        variant: "destructive",
      });
      return;
    }

    // Update the actual bill data
    setEditedBillData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], price: priceValue };
      
      // Recalculate discrepancy
      const itemsSum = updatedItems.reduce((sum, item) => sum + item.price, 0);
      const taxes = prev.taxes ?? 0;
      const otherCharges = prev.otherCharges ?? 0;
      const discount = prev.discount ?? 0;
      const calculatedTotal = itemsSum + taxes + otherCharges - discount;
      const difference = Math.abs(calculatedTotal - prev.totalCost);
      
      const discrepancyFlag = difference > 0.02;
      const discrepancyMessage = discrepancyFlag 
        ? `Receipt total ($${prev.totalCost.toFixed(2)}) differs from calculated total ($${calculatedTotal.toFixed(2)}) by $${difference.toFixed(2)}. This may indicate missing items, fees, or rounding differences.`
        : undefined;

      return {
        ...prev,
        items: updatedItems,
        discrepancyFlag,
        discrepancyMessage
      };
    });
    
    // Clear the editing state
    setEditingPrices(prev => {
      const newState = { ...prev };
      delete newState[itemIndex];
      return newState;
    });
    
    setHasManualEdits(true);
  };

  const handlePriceKeyPress = (event: React.KeyboardEvent<HTMLInputElement>, itemIndex: number, value: string) => {
    if (event.key === 'Enter') {
      (event.currentTarget as HTMLInputElement).blur(); // Trigger onBlur
    }
  };

  // Handle tax editing
  const handleTaxInputChange = (value: string) => {
    setEditingTax(value);
  };

  const handleTaxInputBlur = (value: string) => {
    const trimmedValue = value.replace(/[^0-9.]/g, '');
    const taxValue = parseFloat(trimmedValue);
    
    if (isNaN(taxValue) || taxValue < 0) {
      setEditingTax(null);
      toast({
        title: "Invalid Tax Amount",
        description: "Please enter a valid tax amount greater than or equal to 0.",
        variant: "destructive",
      });
      return;
    }

    setEditedBillData(prev => {
      const itemsSum = prev.items.reduce((sum, item) => sum + item.price, 0);
      const otherCharges = prev.otherCharges ?? 0;
      const discount = prev.discount ?? 0;
      const calculatedTotal = itemsSum + taxValue + otherCharges - discount;
      const difference = Math.abs(calculatedTotal - prev.totalCost);
      
      const discrepancyFlag = difference > 0.02;
      const discrepancyMessage = discrepancyFlag 
        ? `Receipt total ($${prev.totalCost.toFixed(2)}) differs from calculated total ($${calculatedTotal.toFixed(2)}) by $${difference.toFixed(2)}. This may indicate missing items, fees, or rounding differences.`
        : undefined;

      return {
        ...prev,
        taxes: taxValue,
        discrepancyFlag,
        discrepancyMessage
      };
    });
    
    setEditingTax(null);
    setHasManualEdits(true);
  };

  // Handle other charges editing
  const handleOtherChargesInputChange = (value: string) => {
    setEditingOtherCharges(value);
  };

  const handleOtherChargesInputBlur = (value: string) => {
    const trimmedValue = value.replace(/[^0-9.]/g, '');
    const chargesValue = parseFloat(trimmedValue);
    
    if (isNaN(chargesValue) || chargesValue < 0) {
      setEditingOtherCharges(null);
      toast({
        title: "Invalid Charges Amount",
        description: "Please enter a valid charges amount greater than or equal to 0.",
        variant: "destructive",
      });
      return;
    }

    setEditedBillData(prev => {
      const itemsSum = prev.items.reduce((sum, item) => sum + item.price, 0);
      const taxes = prev.taxes ?? 0;
      const discount = prev.discount ?? 0;
      const calculatedTotal = itemsSum + taxes + chargesValue - discount;
      const difference = Math.abs(calculatedTotal - prev.totalCost);
      
      const discrepancyFlag = difference > 0.02;
      const discrepancyMessage = discrepancyFlag 
        ? `Receipt total ($${prev.totalCost.toFixed(2)}) differs from calculated total ($${calculatedTotal.toFixed(2)}) by $${difference.toFixed(2)}. This may indicate missing items, fees, or rounding differences.`
        : undefined;

      return {
        ...prev,
        otherCharges: chargesValue,
        discrepancyFlag,
        discrepancyMessage
      };
    });
    
    setEditingOtherCharges(null);
    setHasManualEdits(true);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      (event.currentTarget as HTMLInputElement).blur();
    }
  };

  const handleSplitTypeChange = (itemId: string, type: SplitType | null) => {
    if (type === null) return;
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
    for (const split of itemSplits) {
      if (split.splitType === 'custom' && split.sharedBy.length === 0) {
        const itemIndex = parseInt(split.itemId.split('-')[1]);
        const item = editedBillData.items[itemIndex];
        toast({
          title: "Incomplete Split",
          description: `Please select members for the custom split of: ${item?.name || split.itemId}.`,
          variant: "destructive",
        });
        onLoadingChange(false);
        return;
      }
    }
    if (typeof editedBillData.taxes === 'number' && editedBillData.taxes > 0 && taxSplitMembers.length === 0) {
      toast({ title: "Incomplete Split", description: "Please select members to split the tax.", variant: "destructive" });
      onLoadingChange(false);
      return;
    }
    if (typeof editedBillData.otherCharges === 'number' && editedBillData.otherCharges > 0 && otherChargesSplitMembers.length === 0) {
      toast({ title: "Incomplete Split", description: "Please select members to split other charges.", variant: "destructive" });
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

  const formatCurrency = (amount: number | undefined | null) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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
                const isEditingPrice = editingPrices[index] !== undefined;
                const displayPrice = isEditingPrice ? editingPrices[index] : item.price.toFixed(2);
                
                return (
                  <AccordionItem value={itemId} key={itemId} className="border rounded-lg overflow-hidden bg-card shadow-sm">
                    <AccordionTrigger className="text-sm px-4 py-3 hover:bg-muted/50 transition-colors [&[data-state=open]]:bg-muted/50">
                        <div className="flex justify-between w-full items-start gap-3">
                            <span className="font-medium text-foreground flex-1 text-left leading-tight">{item.name}</span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span 
                                className={cn(
                                  "text-sm font-semibold px-2 py-1 rounded cursor-pointer transition-colors",
                                  isEditingPrice 
                                    ? "bg-blue-50 text-blue-700 border border-blue-200" 
                                    : "text-gray-700 hover:bg-gray-100"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isEditingPrice) {
                                    setEditingPrices(prev => ({ ...prev, [index]: item.price.toFixed(2) }));
                                  }
                                }}
                              >
                                {isEditingPrice ? (
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={displayPrice}
                                    onChange={(e) => handlePriceInputChange(index, e.target.value)}
                                    onBlur={(e) => handlePriceInputBlur(index, e.target.value)}
                                    onKeyDown={(e) => handlePriceKeyPress(e, index, e.currentTarget.value)}
                                    onFocus={(e) => {
                                      e.stopPropagation();
                                      e.target.select();
                                    }}
                                    className="w-16 text-sm font-semibold text-blue-700 bg-transparent border-0 outline-none text-center"
                                    placeholder="0.00"
                                    autoFocus
                                  />
                                ) : (
                                  `$${item.price.toFixed(2)}`
                                )}
                              </span>
                              <Edit3 className="h-3 w-3 text-gray-400" />
                            </div>
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
                            <UserCheck className="h-5 w-5 mb-1"/>
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
             {(typeof editedBillData.taxes === 'number' && editedBillData.taxes > 0) && (
                <Card className="card-modern">
                    <CardHeader className="flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-medium">Tax</CardTitle>
                        <div className="flex items-center gap-1">
                          <span 
                            className={cn(
                              "text-sm font-semibold px-2 py-1 rounded cursor-pointer transition-colors",
                              editingTax !== null
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "text-gray-700 hover:bg-gray-100"
                            )}
                            onClick={() => {
                              if (editingTax === null) {
                                setEditingTax(editedBillData.taxes?.toFixed(2) || '0.00');
                              }
                            }}
                          >
                            {editingTax !== null ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editingTax}
                                onChange={(e) => handleTaxInputChange(e.target.value)}
                                onBlur={(e) => handleTaxInputBlur(e.target.value)}
                                onKeyDown={handleKeyPress}
                                onFocus={(e) => e.target.select()}
                                className="w-16 text-sm font-semibold text-blue-700 bg-transparent border-0 outline-none text-center"
                                placeholder="0.00"
                                autoFocus
                              />
                            ) : (
                              `$${(editedBillData.taxes ?? 0).toFixed(2)}`
                            )}
                          </span>
                          <Edit3 className="h-3 w-3 text-gray-400" />
                        </div>
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
            
             {(typeof editedBillData.otherCharges === 'number' && editedBillData.otherCharges > 0) && (
                 <Card className="card-modern">
                    <CardHeader className="flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-medium">Other Charges</CardTitle>
                        <div className="flex items-center gap-1">
                          <span 
                            className={cn(
                              "text-sm font-semibold px-2 py-1 rounded cursor-pointer transition-colors",
                              editingOtherCharges !== null
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "text-gray-700 hover:bg-gray-100"
                            )}
                            onClick={() => {
                              if (editingOtherCharges === null) {
                                setEditingOtherCharges(editedBillData.otherCharges?.toFixed(2) || '0.00');
                              }
                            }}
                          >
                            {editingOtherCharges !== null ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editingOtherCharges}
                                onChange={(e) => handleOtherChargesInputChange(e.target.value)}
                                onBlur={(e) => handleOtherChargesInputBlur(e.target.value)}
                                onKeyDown={handleKeyPress}
                                onFocus={(e) => e.target.select()}
                                className="w-16 text-sm font-semibold text-blue-700 bg-transparent border-0 outline-none text-center"
                                placeholder="0.00"
                                autoFocus
                              />
                            ) : (
                              `$${(editedBillData.otherCharges ?? 0).toFixed(2)}`
                            )}
                          </span>
                          <Edit3 className="h-3 w-3 text-gray-400" />
                        </div>
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

            {(typeof editedBillData.discount === 'number' && editedBillData.discount > 0) && (
                <Card className="card-modern">
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
