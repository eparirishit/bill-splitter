"use client";

import * as React from "react";
import { Divide, Users, UserCheck, UserX, Check, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
// import { Checkbox } from "@/components/ui/checkbox"; // Replaced
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { ExtractReceiptDataOutput, SplitwiseUser, ItemSplit } from "@/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Using Card

interface ItemSplittingStepProps {
  billData: ExtractReceiptDataOutput;
  selectedMembers: SplitwiseUser[];
  onSplitsDefined: (itemSplits: ItemSplit[], taxSplit: string[], otherChargesSplit: string[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
  isLoading: boolean;
  onBack: () => void;
}

type SplitType = 'equal' | 'unequal';

interface ItemSplitState extends ItemSplit {
  splitType: SplitType;
}

// Reusable component for rendering member list items (modernized)
const MemberListItemSelect = ({
    member,
    isSelected,
    onSelect,
    disabled,
    itemIdPrefix = 'member-item' // Prefix for unique IDs
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
            "border border-transparent", // Base border
            isSelected ? "bg-primary/10 border-primary/30" : "hover:bg-muted/60", // Selected and hover states
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

// Reusable Member List Container
const MemberSelectionList = ({
    members,
    selectedIds,
    onSelect,
    disabled,
    listHeight = 'max-h-48', // Default height
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
              itemIdPrefix={`${itemIdPrefix}-${member.id}`} // Ensure unique ID prefix per item
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
  // Log the billData and specific fields to check their values and types
  console.log("ItemSplittingStep mounted. billData:", JSON.stringify(billData, null, 2));
  console.log("billData.taxes:", billData.taxes, "| type:", typeof billData.taxes);
  console.log("billData.otherCharges:", billData.otherCharges, "| type:", typeof billData.otherCharges);
  console.log("billData.discount:", billData.discount, "| type:", typeof billData.discount);

  const { toast } = useToast();
  const memberIds = React.useMemo(() => selectedMembers.map(m => m.id), [selectedMembers]);

  // Initialize item splits state
  const initialItemSplits: ItemSplitState[] = React.useMemo(() =>
    billData.items.map((item, index) => ({
      itemId: `item-${index}`,
      splitType: 'equal',
      sharedBy: memberIds,
    })), [billData.items, memberIds]
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
  }, [billData.items, memberIds.join(",")]);

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
        if (split.itemId === itemId && split.splitType === 'unequal') {
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
    console.log("handleChargeMemberSelection Data:", chargeType, memberId);
    if (chargeType === 'tax') {
      setTaxSplitMembers(prev =>
        prev.includes(memberId)
          ? prev.filter(id => id !== memberId)
          : [...prev, memberId]
      );
      console.log("setOtherChargesSplitMembers Data:", chargeType, memberId);
    } else {
      setOtherChargesSplitMembers(prev =>
        prev.includes(memberId)
          ? prev.filter(id => id !== memberId)
          : [...prev, memberId]
      );
      console.log("setOtherChargesSplitMembers Data:", chargeType, memberId);
    }
  };

  const handleProceedToReview = () => {
    onLoadingChange(true);
    for (const split of itemSplits) {
      if (split.splitType === 'unequal' && split.sharedBy.length === 0) {
        const itemIndex = parseInt(split.itemId.split('-')[1]);
        const item = billData.items[itemIndex];
        toast({
          title: "Incomplete Split",
          description: `Please select members for the unequal split of: ${item?.name || split.itemId}.`,
          variant: "destructive",
        });
        onLoadingChange(false);
        return;
      }
    }
    if (typeof billData.taxes === 'number' && billData.taxes > 0 && taxSplitMembers.length === 0) {
      toast({ title: "Incomplete Split", description: "Please select members to split the tax.", variant: "destructive" });
      onLoadingChange(false);
      return;
    }
    if (typeof billData.otherCharges === 'number' && billData.otherCharges > 0 && otherChargesSplitMembers.length === 0) {
      toast({ title: "Incomplete Split", description: "Please select members to split other charges.", variant: "destructive" });
      onLoadingChange(false);
      return;
    }
    const finalItemSplits: ItemSplit[] = itemSplits.map(({ itemId, sharedBy, splitType }) => ({
      itemId,
      sharedBy: splitType === 'equal' ? memberIds : sharedBy
    }));

    const finalTaxSplitMembers = (typeof billData.taxes === 'number' && billData.taxes > 0) ? taxSplitMembers : [];
    const finalOtherChargesSplitMembers = (typeof billData.otherCharges === 'number' && billData.otherCharges > 0) ? otherChargesSplitMembers : [];

    onSplitsDefined(finalItemSplits, finalTaxSplitMembers, finalOtherChargesSplitMembers);
    // Keep loading indicator until next step transition
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-fade-in pt-2">
        {/* Step Title */}
        <div className="px-1">
            <h2 className="text-2xl font-semibold mb-1">Split Items & Charges</h2>
            <p className="text-muted-foreground text-sm">How should each item be divided?</p>
        </div>

         {/* Scrollable Content Area */}
        <div className="flex-grow space-y-4 overflow-y-auto pb-24"> {/* Add padding-bottom for button */}

            {/* Item Splitting Accordion */}
            <Accordion type="multiple" className="w-full space-y-3">
              {billData.items.map((item, index) => {
                const itemId = `item-${index}`;
                const currentSplit = itemSplits.find(s => s.itemId === itemId);
                return (
                  <AccordionItem value={itemId} key={itemId} className="border rounded-lg overflow-hidden bg-card shadow-sm">
                    <AccordionTrigger className="text-sm px-4 py-3 hover:bg-muted/50 transition-colors [&[data-state=open]]:bg-muted/50">
                        <div className="flex justify-between w-full items-center">
                            <span className="font-medium text-foreground truncate mr-4">{item.name}</span>
                            <span className="text-muted-foreground whitespace-nowrap">{formatCurrency(item.price)}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 p-4 bg-background border-t">
                      {/* Modern Toggle Group for Split Type */}
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
                            value="unequal"
                            aria-label="Split unequally"
                           className="flex flex-col items-center justify-center h-auto p-3 rounded-lg border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary data-[state=on]:shadow-md tap-scale"
                         >
                            <UserCheck className="h-5 w-5 mb-1"/>
                            <span className="text-xs font-medium">Unequally</span>
                        </ToggleGroupItem>
                      </ToggleGroup>

                      {/* Conditional Member Selection for Unequal Split */}
                      {currentSplit?.splitType === 'unequal' && (
                        <div className="space-y-2 pt-2 flex flex-col"> {/* Added flex flex-col */}
                          <Label className="text-xs font-medium text-muted-foreground block mb-1.5">Select who shared this item:</Label>
                           <MemberSelectionList
                              members={selectedMembers}
                              selectedIds={currentSplit.sharedBy}
                              onSelect={(memberId) => handleMemberSelectionChange(itemId, memberId)}
                              disabled={isLoading}
                              listHeight="max-h-40"
                              itemIdPrefix={`item-${itemId}`} // Unique prefix for this item's checkboxes
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

            {/* Tax & Charges Splitting Cards */}
             {(typeof billData.taxes === 'number' && billData.taxes > 0) && (
                <Card className="card-modern">
                    <CardHeader className="flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-medium">Tax</CardTitle>
                        <span className="font-semibold">{formatCurrency(billData.taxes)}</span>
                    </CardHeader>
                    <CardContent className="pt-0"> {/* Ensure this is not commented out */}
                         <p className="text-xs text-muted-foreground mb-3">Select members to split tax equally.</p>
                         <MemberSelectionList
                             members={selectedMembers}
                             selectedIds={taxSplitMembers}
                             onSelect={(memberId) => handleChargeMemberSelection('tax', memberId)}
                             disabled={isLoading}
                             itemIdPrefix="tax-split" // Unique prefix
                             listHeight="max-h-40"
                         />
                         {taxSplitMembers.length === 0 && (
                             <p className="text-xs text-destructive pt-2">Select at least one member.</p>
                         )}
                    </CardContent>
                </Card>
             )}
            
             {(typeof billData.otherCharges === 'number' && billData.otherCharges > 0) && (
                 <Card className="card-modern">
                    <CardHeader className="flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-medium">Other Charges</CardTitle>
                        <span className="font-semibold">{formatCurrency(billData.otherCharges)}</span>
                    </CardHeader>
                    <CardContent className="pt-0"> {/* Ensure this is not commented out */}
                         <p className="text-xs text-muted-foreground mb-3">Select members to split charges equally.</p>
                          <MemberSelectionList
                             members={selectedMembers}
                             selectedIds={otherChargesSplitMembers}
                             onSelect={(memberId) => handleChargeMemberSelection('other', memberId)}
                             disabled={isLoading}
                             itemIdPrefix="other-split" // Unique prefix
                             listHeight="max-h-40"
                           />
                            {otherChargesSplitMembers.length === 0 && (
                                <p className="text-xs text-destructive pt-2">Select at least one member.</p>
                             )}
                    </CardContent>
                 </Card>
             )}

            {/* Discount Display Card (Informational) */}
            {(typeof billData.discount === 'number' && billData.discount > 0) && (
                <Card className="card-modern">
                    <CardHeader className="flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-medium">Discount</CardTitle>
                        <span className="font-semibold text-green-600">-{formatCurrency(billData.discount)}</span>
                    </CardHeader>
                    <CardContent className="pt-0">
                         <p className="text-xs text-muted-foreground">
                            A discount of {formatCurrency(billData.discount)} will be applied to the total.
                         </p>
                    </CardContent>
                </Card>
             )}

        </div>


        {/* Sticky Footer Buttons */}
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
