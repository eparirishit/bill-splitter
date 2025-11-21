"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SplitwiseUser } from "@/types";
import { Check } from "lucide-react";
import * as React from "react";

interface MemberListItemProps {
  member: SplitwiseUser;
  isSelected: boolean;
  onSelect: (memberId: string) => void;
  disabled: boolean;
  itemIdPrefix?: string;
}

export const MemberListItem = React.forwardRef<HTMLDivElement, MemberListItemProps>(
  ({ member, isSelected, onSelect, disabled, itemIdPrefix = 'member-item' }, ref) => {
    const uniqueId = `${itemIdPrefix}-${member.id}`;
    
    return (
      <div
        ref={ref}
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
        onKeyDown={(e) => { 
          if (e.key === ' ' || e.key === 'Enter') { 
            !disabled && onSelect(member.id); 
            e.preventDefault(); 
          }
        }}
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
  }
);

MemberListItem.displayName = "MemberListItem";

