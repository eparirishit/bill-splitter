"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { SplitwiseUser } from "@/types";

interface MemberListItemProps {
  member: SplitwiseUser;
  isSelected: boolean;
  onSelect: (memberId: string) => void;
  disabled: boolean;
  itemIdPrefix?: string;
}

const MemberListItem = React.memo(({
  member,
  isSelected,
  onSelect,
  disabled,
  itemIdPrefix = 'member-item'
}: MemberListItemProps) => {
  const uniqueId = `${itemIdPrefix}-${member.id}`;
  
  const handleClick = () => {
    if (!disabled) {
      onSelect(member.id);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === ' ' || event.key === 'Enter') && !disabled) {
      event.preventDefault();
      onSelect(member.id);
    }
  };

  return (
    <div
      onClick={handleClick}
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
      onKeyDown={handleKeyDown}
    >
      <Label 
        id={`${uniqueId}-label`} 
        className={cn(
          "font-medium flex-grow cursor-pointer", 
          isSelected ? "text-primary" : "text-foreground"
        )}
      >
        {member.first_name} {member.last_name}
      </Label>
      {isSelected && <Check className="h-5 w-5 text-primary flex-shrink-0" />}
    </div>
  );
});

MemberListItem.displayName = "MemberListItem";

export interface MemberSelectionListProps {
  members: SplitwiseUser[];
  selectedIds: string[];
  onSelect: (memberId: string) => void;
  disabled?: boolean;
  listHeight?: string;
  itemIdPrefix?: string;
  multiSelect?: boolean;
  emptyMessage?: string;
}

export const MemberSelectionList = React.memo(({
  members,
  selectedIds,
  onSelect,
  disabled = false,
  listHeight = 'max-h-48',
  itemIdPrefix = 'member-list',
  emptyMessage = "No members available"
}: MemberSelectionListProps) => {
  if (members.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ScrollArea className={cn("w-full scrollArea rounded-md border", listHeight)}>
      <div className="p-2 space-y-1.5">
        {members.map(member => (
          <MemberListItem
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
});

MemberSelectionList.displayName = "MemberSelectionList";
