"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useBillEditing } from "@/hooks/use-bill-editing";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { UserTrackingService } from "@/services/user-tracking";
import type { ExtractReceiptDataOutput, ItemSplit, SplitwiseUser } from "@/types";
import { AlertTriangle, ArrowLeft, ArrowRight, Bot, Check, Edit3, Loader2, MoreVertical, Plus, Trash2, UserCheck, Users, X } from "lucide-react";
import * as React from "react";

interface ItemSplittingStepProps {
  billData: ExtractReceiptDataOutput;
  selectedMembers: SplitwiseUser[];
  itemSplits?: ItemSplit[];
  taxSplit?: string[];
  otherChargesSplit?: string[];
  onSplitsDefined: (itemSplits: ItemSplit[], taxSplit: string[], otherChargesSplit: string[], updatedBillData?: ExtractReceiptDataOutput) => void;
  onLoadingChange: (isLoading: boolean) => void;
  isLoading: boolean;
  onBack: () => void;
  userId?: string;
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
  itemSplits: contextItemSplits,
  taxSplit: contextTaxSplit,
  otherChargesSplit: contextOtherChargesSplit,
  onSplitsDefined,
  onLoadingChange,
  isLoading,
  onBack,
  userId
}: ItemSplittingStepProps) {
  const { toast } = useToast();
  const memberIds = React.useMemo(() => selectedMembers.map(m => m.id), [selectedMembers]);

  // Use the bill editing hook
  const {
    editedBillData,
    editingPrices,
    editingNames,
    editingTax,
    editingOtherCharges,
    editingDiscount,
    editingTotalCost,
    hasManualEdits,
    handleItemPriceChange,
    handlePriceInputChange,
    handlePriceInputBlur,
    handleItemNameChange,
    handleNameInputChange,
    handleNameInputBlur,
    handleTaxInputChange,
    handleTaxInputBlur,
    handleOtherChargesInputChange,
    handleOtherChargesInputBlur,
    handleDiscountInputChange,
    handleDiscountInputBlur,
    handleTotalCostInputChange,
    handleTotalCostInputBlur,
    handleKeyPress,
    handleAddItem,
    handleRemoveItem
  } = useBillEditing(billData);

  // Get existing splits from context or initialize new ones
  const existingItemSplits = React.useMemo(() => {
    if (contextItemSplits && contextItemSplits.length > 0) {
      // Convert context ItemSplit to ItemSplitState
      return contextItemSplits.map(split => ({
        ...split,
        splitType: split.splitType || 'equal'
      }));
    }
    return editedBillData.items.map((item, index) => ({
      itemId: `item-${index}`,
      splitType: 'equal' as SplitType,
      sharedBy: memberIds,
    }));
  }, [contextItemSplits, editedBillData.items, memberIds]);

  const [localItemSplits, setLocalItemSplits] = React.useState<ItemSplitState[]>(existingItemSplits);
  const [taxSplitMembers, setTaxSplitMembers] = React.useState<string[]>(
    contextTaxSplit && contextTaxSplit.length > 0 ? contextTaxSplit : memberIds
  );
  const [otherChargesSplitMembers, setOtherChargesSplitMembers] = React.useState<string[]>(
    contextOtherChargesSplit && contextOtherChargesSplit.length > 0 ? contextOtherChargesSplit : memberIds
  );

  // Add item form state
  const [showAddItemForm, setShowAddItemForm] = React.useState(false);
  const [newItemName, setNewItemName] = React.useState("");
  const [newItemPrice, setNewItemPrice] = React.useState("");

  // Edit item state
  const [editingItemIndex, setEditingItemIndex] = React.useState<number | null>(null);
  const [editItemName, setEditItemName] = React.useState("");
  const [editItemPrice, setEditItemPrice] = React.useState("");

  // Update local state when context state changes (e.g., when navigating back)
  React.useEffect(() => {
    setLocalItemSplits(existingItemSplits);
    setTaxSplitMembers(
      contextTaxSplit && contextTaxSplit.length > 0 ? contextTaxSplit : memberIds
    );
    setOtherChargesSplitMembers(
      contextOtherChargesSplit && contextOtherChargesSplit.length > 0 ? contextOtherChargesSplit : memberIds
    );
  }, [existingItemSplits, contextTaxSplit, contextOtherChargesSplit, memberIds]);

  // Reset splits if members or items change (but preserve existing splits if possible)
  React.useEffect(() => {
    if (editedBillData.items.length !== localItemSplits.length) {
      // Items changed, need to reinitialize
      setLocalItemSplits(editedBillData.items.map((item, index) => ({
        itemId: `item-${index}`,
        splitType: 'equal' as SplitType,
        sharedBy: memberIds,
      })));
    }
    if (memberIds.length !== selectedMembers.length) {
      // Members changed, need to reinitialize
      setTaxSplitMembers(memberIds);
      setOtherChargesSplitMembers(memberIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedBillData.items.length, memberIds.length]);

  // Sync localItemSplits when editedBillData.items changes (for add/remove operations)
  React.useEffect(() => {
    // Only update if the number of items has changed
    if (editedBillData.items.length !== localItemSplits.length) {
      // If items were added, preserve existing splits and add new ones
      if (editedBillData.items.length > localItemSplits.length) {
        const newSplits = editedBillData.items.slice(localItemSplits.length).map((_, index) => ({
          itemId: `item-${localItemSplits.length + index}`,
          splitType: 'equal' as SplitType,
          sharedBy: memberIds,
        }));
        setLocalItemSplits(prev => [...prev, ...newSplits]);
      }
      // If items were removed, the handleRemoveItemWithConfirmation already handles this
    }
  }, [editedBillData.items.length, localItemSplits.length, memberIds]);

  // Price editing handlers are now provided by useBillEditing hook

  const handleSplitTypeChange = (itemId: string, type: SplitType | null) => {
    if (type === null) return;
    setLocalItemSplits(prev =>
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
    setLocalItemSplits(prev =>
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

  const handleAddNewItem = () => {
    const trimmedName = newItemName.trim();
    const price = parseFloat(newItemPrice);
    
    if (trimmedName.length === 0) {
      toast({
        title: "Invalid Item Name",
        description: "Please enter a valid item name.",
        variant: "destructive",
      });
      return;
    }
    
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive",
      });
      return;
    }

    // Add the item to the bill data
    handleAddItem(trimmedName, price);
    
    // Add a new split for this item - use current length as the new index
    const newItemIndex = editedBillData.items.length; // This will be the index after adding
    const newSplit: ItemSplitState = {
      itemId: `item-${newItemIndex}`,
      splitType: 'equal',
      sharedBy: memberIds,
    };
    
    setLocalItemSplits(prev => [...prev, newSplit]);
    
    // Reset form
    setNewItemName("");
    setNewItemPrice("");
    setShowAddItemForm(false);
    
    toast({
      title: "Item Added",
      description: `${trimmedName} has been added to the bill.`,
      variant: "default",
    });
  };

  const handleEditItem = (itemIndex: number) => {
    const item = editedBillData.items[itemIndex];
    setEditingItemIndex(itemIndex);
    setEditItemName(item.name);
    setEditItemPrice(item.price.toFixed(2));
  };

  const handleSaveItemEdit = () => {
    if (editingItemIndex === null) return;
    
    const trimmedName = editItemName.trim();
    const price = parseFloat(editItemPrice);
    
    if (trimmedName.length === 0) {
      toast({
        title: "Invalid Item Name",
        description: "Please enter a valid item name.",
        variant: "destructive",
      });
      return;
    }
    
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive",
      });
      return;
    }

    // Update the item name and price
    handleItemNameChange(editingItemIndex, trimmedName);
    handleItemPriceChange(editingItemIndex, editItemPrice);
    
    setEditingItemIndex(null);
    setEditItemName("");
    setEditItemPrice("");
    
    toast({
      title: "Item Updated",
      description: `${trimmedName} has been updated.`,
      variant: "default",
    });
  };

  const handleCancelItemEdit = () => {
    setEditingItemIndex(null);
    setEditItemName("");
    setEditItemPrice("");
  };

  const handleRemoveItemWithConfirmation = (itemIndex: number) => {
    if (editedBillData.items.length <= 1) {
      toast({
        title: "Cannot Remove Item",
        description: "At least one item must remain on the bill.",
        variant: "destructive",
      });
      return;
    }

    const itemName = editedBillData.items[itemIndex]?.name || "this item";
    
    if (window.confirm(`Are you sure you want to remove "${itemName}" from the bill?`)) {
      // Remove the item from bill data
      handleRemoveItem(itemIndex);
      
      // Remove the corresponding split and reindex remaining splits
      setLocalItemSplits(prev => {
        const updatedSplits = prev.filter((_, index) => index !== itemIndex);
        // Reindex the remaining splits to match new item indices
        return updatedSplits.map((split, index) => ({
          ...split,
          itemId: `item-${index}`
        }));
      });
      
      toast({
        title: "Item Removed",
        description: `${itemName} has been removed from the bill.`,
        variant: "default",
      });
    }
  };

  const handleProceedToReview = async () => {
    onLoadingChange(true);
    for (const split of localItemSplits) {
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
    const finalItemSplits: ItemSplit[] = localItemSplits.map(({ itemId, sharedBy, splitType }) => ({
      itemId,
      sharedBy: splitType === 'equal' ? memberIds : sharedBy,
      splitType
    }));

    const finalTaxSplitMembers = (typeof editedBillData.taxes === 'number' && editedBillData.taxes > 0) ? taxSplitMembers : [];
    const finalOtherChargesSplitMembers = (typeof editedBillData.otherCharges === 'number' && editedBillData.otherCharges > 0) ? otherChargesSplitMembers : [];

    // Track corrections if any were made
    if (hasManualEdits && userId) {
      try {
        // Count total corrections
        let correctionCount = 0;
        
        // Check item corrections
        editedBillData.items.forEach((item, index) => {
          const originalItem = billData.items[index];
          if (originalItem) {
            if (item.name !== originalItem.name) correctionCount++;
            if (item.price !== originalItem.price) correctionCount++;
          }
        });
        
        // Check other corrections
        if (editedBillData.taxes !== billData.taxes) correctionCount++;
        if (editedBillData.otherCharges !== billData.otherCharges) correctionCount++;
        if (editedBillData.discount !== billData.discount) correctionCount++;
        if (editedBillData.totalCost !== billData.totalCost) correctionCount++;
        
        if (correctionCount > 0) {
          await UserTrackingService.incrementCorrectionsMade(userId, correctionCount);
        }
      } catch (error) {
        console.warn('Failed to track corrections:', error);
      }
    }

    onSplitsDefined(finalItemSplits, finalTaxSplitMembers, finalOtherChargesSplitMembers, hasManualEdits ? editedBillData : undefined);
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Calculate the total based on current item prices, tax, other charges, and discount
  const calculateTotalFromComponents = () => {
    return editedBillData.items.reduce((sum, item) => sum + item.price, 0) +
           (editedBillData.taxes ?? 0) +
           (editedBillData.otherCharges ?? 0) -
           (editedBillData.discount ?? 0);
  };

  // Calculate items subtotal
  const calculateItemsSubtotal = () => {
    return editedBillData.items.reduce((sum, item) => sum + item.price, 0);
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
            <p className="text-xs mt-1">This information was extracted using AI and may contain errors. Please review and edit details if needed.</p>
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
            {/* Add Item Section */}
            <Card className="card-modern">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Manage Items</CardTitle>
              </CardHeader>
              <CardContent>
                {!showAddItemForm ? (
                  <Button
                    onClick={() => setShowAddItemForm(true)}
                    variant="outline"
                    className="w-full hover:bg-primary/10 hover:text-primary"
                    disabled={isLoading}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Item
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="new-item-name">Item Name</Label>
                      <Input
                        id="new-item-name"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Enter item name"
                        disabled={isLoading}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewItem();
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-item-price">Price</Label>
                      <Input
                        id="new-item-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        placeholder="0.00"
                        disabled={isLoading}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewItem();
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleAddNewItem}
                        disabled={isLoading || !newItemName.trim() || !newItemPrice}
                        className="flex-1"
                      >
                        Add Item
                      </Button>
                      <Button
                        onClick={() => {
                          setShowAddItemForm(false);
                          setNewItemName("");
                          setNewItemPrice("");
                        }}
                        variant="outline"
                        disabled={isLoading}
                        className="hover:bg-primary/10 hover:text-primary"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Accordion type="multiple" className="w-full space-y-3">
              {editedBillData.items.map((item, index) => {
                const itemId = `item-${index}`;
                const currentSplit = localItemSplits.find(s => s.itemId === itemId);
                const isEditingPrice = editingPrices[index] !== undefined;
                const isEditingName = editingNames[index] !== undefined;
                const isEditingItem = editingItemIndex === index;
                const displayPrice = isEditingPrice ? editingPrices[index] : item.price.toFixed(2);
                const displayName = isEditingName ? editingNames[index] : item.name;
                
                return (
                  <AccordionItem value={itemId} key={itemId} className="border rounded-lg overflow-hidden bg-card shadow-sm">
                    <div className="relative">
                      <AccordionTrigger className="text-sm px-4 py-3 hover:bg-muted/50 transition-colors [&[data-state=open]]:bg-muted/50">
                          <div className="flex justify-between w-full items-center gap-3">
                              <div className="flex-1 text-left">
                                {isEditingItem ? (
                                  <div className="flex items-center gap-2 w-full">
                                    <input
                                      type="text"
                                      value={editItemName}
                                      onChange={(e) => setEditItemName(e.target.value)}
                                      className="flex-1 text-sm font-medium text-primary bg-transparent border border-primary/30 rounded px-2 py-1 outline-none focus:border-primary"
                                      placeholder="Item name"
                                    />
                                    <span className="text-sm font-semibold text-muted-foreground">$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={editItemPrice}
                                      onChange={(e) => setEditItemPrice(e.target.value)}
                                      className="w-20 text-sm font-semibold text-primary bg-transparent border border-primary/30 rounded px-2 py-1 outline-none text-center focus:border-primary"
                                      placeholder="0.00"
                                    />
                                  </div>
                                ) : (
                                  <span className="font-medium text-foreground text-sm">
                                    {item.name}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 mr-8">
                                {!isEditingItem && (
                                  <span className="text-sm font-semibold text-foreground">
                                    ${item.price.toFixed(2)}
                                  </span>
                                )}
                              </div>
                          </div>
                      </AccordionTrigger>
                      
                      {/* Settings dropdown */}
                      <div className="absolute right-8 top-1/2 -translate-y-1/2">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-sm border-0 bg-transparent flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                            onClick={(e) => e.stopPropagation()}
                            disabled={isLoading}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditItem(index);
                              }}
                              disabled={isLoading}
                              className="focus:bg-primary/10 focus:text-primary"
                            >
                              <Edit3 className="mr-2 h-4 w-4" />
                              Edit Item
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveItemWithConfirmation(index);
                              }}
                              disabled={isLoading || editedBillData.items.length <= 1}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Item
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <AccordionContent className="space-y-4 p-4 bg-background border-t">
                      {isEditingItem ? (
                        <div className="space-y-3">
                          <div className="text-sm text-muted-foreground">
                            Edit item details:
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleSaveItemEdit}
                              size="sm"
                              disabled={isLoading}
                            >
                              Save Changes
                            </Button>
                            <Button
                              onClick={handleCancelItemEdit}
                              variant="outline"
                              size="sm"
                              disabled={isLoading}
                              className="hover:bg-primary/10 hover:text-primary"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
             {(typeof editedBillData.taxes === 'number' && editedBillData.taxes > 0) && (
                <Card className="card-modern">
                    <CardHeader className="flex-row items-center justify-between">
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
                                handleTaxInputChange(editedBillData.taxes?.toFixed(2) || '0.00');
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
                    {/* <CardContent className="pt-0">
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
                    </CardContent> */}
                </Card>
             )}
            
             {(typeof editedBillData.otherCharges === 'number' && editedBillData.otherCharges > 0) && (
                 <Card className="card-modern">
                    <CardHeader className="flex-row items-center justify-between">
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
                                handleOtherChargesInputChange(editedBillData.otherCharges?.toFixed(2) || '0.00');
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
                    {/* <CardContent className="pt-0">
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
                    </CardContent> */}
                 </Card>
             )}

            {(typeof editedBillData.discount === 'number' && editedBillData.discount > 0) && (
                <Card className="card-modern">
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle className="text-base font-medium">Discount</CardTitle>
                        <div className="flex items-center gap-1">
                          <span 
                            className={cn(
                              "text-sm font-semibold px-2 py-1 rounded cursor-pointer transition-colors",
                              editingDiscount !== null
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "text-green-600 hover:bg-gray-100"
                            )}
                            onClick={() => {
                              if (editingDiscount === null) {
                                handleDiscountInputChange(editedBillData.discount?.toFixed(2) || '0.00');
                              }
                            }}
                          >
                            {editingDiscount !== null ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editingDiscount}
                                onChange={(e) => handleDiscountInputChange(e.target.value)}
                                onBlur={(e) => handleDiscountInputBlur(e.target.value)}
                                onKeyDown={handleKeyPress}
                                onFocus={(e) => e.target.select()}
                                className="w-16 text-sm font-semibold text-blue-700 bg-transparent border-0 outline-none text-center"
                                placeholder="0.00"
                                autoFocus
                              />
                            ) : (
                              `-$${(editedBillData.discount ?? 0).toFixed(2)}`
                            )}
                          </span>
                          <Edit3 className="h-3 w-3 text-gray-400" />
                        </div>
                    </CardHeader>
                    {/* <CardContent className="pt-0">
                         <p className="text-xs text-muted-foreground">
                            A discount of {formatCurrency(editedBillData.discount)} will be applied to the total.
                         </p>
                    </CardContent> */}
                </Card>
             )}

            {/* Total Bill Summary */}
            <Card className="card-modern">
                <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-medium">Total Bill</CardTitle>
                    <div className="flex items-center gap-1">
                      <span 
                        className={cn(
                          "text-lg font-bold px-2 py-1 rounded cursor-pointer transition-colors",
                          editingTotalCost !== null
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "text-gray-700 hover:bg-gray-100"
                        )}
                        onClick={() => {
                          if (editingTotalCost === null) {
                            handleTotalCostInputChange(editedBillData.totalCost.toFixed(2));
                          }
                        }}
                      >
                        {editingTotalCost !== null ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editingTotalCost}
                            onChange={(e) => handleTotalCostInputChange(e.target.value)}
                            onBlur={(e) => handleTotalCostInputBlur(e.target.value)}
                            onKeyDown={handleKeyPress}
                            onFocus={(e) => e.target.select()}
                            className="w-20 text-lg font-bold text-blue-700 bg-transparent border-0 outline-none text-center"
                            placeholder="0.00"
                            autoFocus
                          />
                        ) : (
                          `$${editedBillData.totalCost.toFixed(2)}`
                        )}
                      </span>
                      <Edit3 className="h-4 w-4 text-gray-400" />
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Items Subtotal:</span>
                            <span className="font-medium">{formatCurrency(calculateItemsSubtotal())}</span>
                        </div>
                        
                        {/* Tax Row - Always show */}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax:</span>
                            <span className="font-medium">{formatCurrency(editedBillData.taxes ?? 0)}</span>
                        </div>
                        
                        {/* Other Charges Row - Always show */}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Other Charges:</span>
                            <span className="font-medium">{formatCurrency(editedBillData.otherCharges ?? 0)}</span>
                        </div>
                        
                        {/* Discount Row - Always show */}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Discount:</span>
                            <span className="font-medium text-green-600">-{formatCurrency(editedBillData.discount ?? 0)}</span>
                        </div>
                        
                        {/* Calculated Total */}
                        {(() => {
                          const calculatedTotal = calculateTotalFromComponents();
                          const extractedTotal = editedBillData.totalCost;
                          const hasChanges = Math.abs(calculatedTotal - extractedTotal) > 0.01;
                          
                          return (
                            <>
                              <div className="border-t pt-2 flex justify-between">
                                <span className="font-semibold">Calculated Total:</span>
                                <span className={cn(
                                  "font-bold text-lg",
                                  hasChanges ? "text-primary" : "text-gray-700"
                                )}>
                                  {formatCurrency(calculatedTotal)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Extracted Total:</span>
                                <span className={cn(
                                  "text-sm font-medium",
                                  hasChanges ? "text-orange-700 dark:text-orange-400" : "text-muted-foreground"
                                )}>
                                  {formatCurrency(extractedTotal)}
                                </span>
                              </div>
                              {hasChanges && (
                                <div className="text-xs border border-orange-500/50 bg-orange-500/10 p-2 rounded text-orange-700 dark:text-orange-400">
                                  <strong>Note:</strong> The calculated total differs from the extracted total by {formatCurrency(Math.abs(calculatedTotal - extractedTotal))}. 
                                  This may be due to rounding differences, missing items, or fees not captured in the breakdown.
                                </div>
                              )}
                            </>
                          );
                        })()}
                    </div>
                </CardContent>
            </Card>

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
