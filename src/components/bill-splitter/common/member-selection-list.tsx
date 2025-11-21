"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { SplitwiseUser } from "@/types";
import * as React from "react";
import { MemberListItem } from "./member-list-item";

interface MemberSelectionListProps {
  members: SplitwiseUser[];
  selectedIds: string[];
  onSelect: (memberId: string) => void;
  disabled: boolean;
  listHeight?: string;
  itemIdPrefix?: string;
  emptyMessage?: string;
}

export function MemberSelectionList({
  members,
  selectedIds,
  onSelect,
  disabled,
  listHeight = "h-60",
  itemIdPrefix = "member",
  emptyMessage = "No members found."
}: MemberSelectionListProps) {
  if (members.length === 0) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ScrollArea className={listHeight}>
      <div className="space-y-1 p-2">
        {members.map((member) => (
          <MemberListItem
            key={member.id}
            member={member}
            isSelected={selectedIds.includes(member.id)}
            onSelect={onSelect}
            disabled={disabled}
            itemIdPrefix={itemIdPrefix}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
