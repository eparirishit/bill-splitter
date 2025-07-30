"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SplitwiseService } from "@/services/splitwise";
import type { SplitwiseGroup, SplitwiseUser } from "@/types";
import { ArrowLeft, Check, Loader2, Users } from "lucide-react";
import * as React from "react";

interface GroupSelectionStepProps {
  selectedGroupId?: string | null;
  selectedMembers?: SplitwiseUser[];
  onGroupAndMembersSelected: (groupId: string, members: SplitwiseUser[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
  isLoading: boolean;
  onBack: () => void;
}

const MemberListItem = ({ member, isSelected, onSelect, disabled }: {
    member: SplitwiseUser;
    isSelected: boolean;
    onSelect: (memberId: string) => void;
    disabled: boolean;
}) => (
    <div
      key={member.id}
      onClick={() => !disabled && onSelect(member.id)}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors duration-150",
        "border border-transparent",
        isSelected ? "bg-primary/10 border-primary/30" : "hover:bg-muted/60",
        disabled ? "opacity-60 cursor-not-allowed" : "tap-scale"
      )}
    >
        <span className={cn("font-medium", isSelected ? "text-primary" : "text-foreground")}>
            {member.first_name} {member.last_name}
        </span>
        {isSelected && <Check className="h-5 w-5 text-primary" />}
    </div>
);

export function GroupSelectionStep({ 
  selectedGroupId: contextSelectedGroupId, 
  selectedMembers: contextSelectedMembers, 
  onGroupAndMembersSelected, 
  onLoadingChange, 
  isLoading, 
  onBack 
}: GroupSelectionStepProps) {
  const [groups, setGroups] = React.useState<SplitwiseGroup[]>([]);
  const [localSelectedGroupId, setLocalSelectedGroupId] = React.useState<string | null>(contextSelectedGroupId || null);
  const [groupMembers, setGroupMembers] = React.useState<SplitwiseUser[]>([]);
  const [localSelectedMembers, setLocalSelectedMembers] = React.useState<string[]>(
    contextSelectedMembers ? contextSelectedMembers.map(m => m.id) : []
  );
  const [isFetchingGroups, setIsFetchingGroups] = React.useState(false);
  const [isFetchingMembers, setIsFetchingMembers] = React.useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Update local state when context state changes
  React.useEffect(() => {
    setLocalSelectedGroupId(contextSelectedGroupId || null);
    setLocalSelectedMembers(contextSelectedMembers ? contextSelectedMembers.map(m => m.id) : []);
  }, [contextSelectedGroupId, contextSelectedMembers]);

  React.useEffect(() => {
    const fetchGroups = async () => {
      if (!isAuthenticated) return;

      onLoadingChange(true);
      setIsFetchingGroups(true);
      try {
        const fetchedGroups = await SplitwiseService.getGroups();
        console.log("Fetched groups:", fetchedGroups);
        setGroups(fetchedGroups);
        if (fetchedGroups.length === 0) {
             toast({ title: "No Groups Found", description: "No Splitwise groups were found.", variant: "default" });
        }
      } catch (error) {
        console.error("Splitwise fetch groups failed:", error);
        toast({
          title: "Fetch Failed",
          description: "Could not fetch Splitwise groups.",
          variant: "destructive",
        });
      } finally {
        onLoadingChange(false);
        setIsFetchingGroups(false);
      }
    };
    fetchGroups();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  React.useEffect(() => {
    const fetchMembers = async () => {
      if (localSelectedGroupId && isAuthenticated) {
        console.log("Selected groupId:", localSelectedGroupId);
        onLoadingChange(true);
        setIsFetchingMembers(true);
        setGroupMembers([]);
        try {
          const members = await SplitwiseService.getGroupMembers(localSelectedGroupId);
          console.log("Fetched members for group", localSelectedGroupId, ":", members);
          setGroupMembers(members);
          
          // Only set all members as selected if there are no existing selections for this group
          // or if the group has changed
          const existingSelections = contextSelectedMembers ? contextSelectedMembers.map(m => m.id) : [];
          const hasExistingSelections = existingSelections.length > 0;
          
          if (!hasExistingSelections) {
            // No existing selections, select all members by default
            setLocalSelectedMembers(members.map(m => m.id));
          } else {
            // Keep existing selections, but filter to only include members from this group
            const validSelections = existingSelections.filter(id => 
              members.some(m => m.id === id)
            );
            setLocalSelectedMembers(validSelections.length > 0 ? validSelections : members.map(m => m.id));
          }
        } catch (error) {
          console.error("Error fetching group members:", error);
          toast({
            title: "Fetch Failed",
            description: "Could not fetch group members.",
            variant: "destructive",
          });
          setGroupMembers([]);
          setLocalSelectedMembers([]);
        } finally {
          onLoadingChange(false);
          setIsFetchingMembers(false);
        }
      } else {
        setGroupMembers([]);
        setLocalSelectedMembers([]);
      }
    };
    fetchMembers();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSelectedGroupId, isAuthenticated, contextSelectedMembers]);

  const handleMemberSelection = (memberId: string) => {
    setLocalSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleProceed = () => {
    if (!localSelectedGroupId) {
        toast({ title: "No Group Selected", description: "Please select a group.", variant: "destructive"});
        return;
    }
    if (localSelectedMembers.length === 0) {
        toast({ title: "No Members Selected", description: "Please select at least one member.", variant: "destructive"});
        return;
    }
    const finalSelectedUsers = groupMembers.filter(member => localSelectedMembers.includes(member.id));
    onGroupAndMembersSelected(localSelectedGroupId, finalSelectedUsers);
  };

  const isProceedDisabled = isLoading || !localSelectedGroupId || localSelectedMembers.length === 0 || isFetchingGroups || isFetchingMembers;
  const isCurrentlyLoading = isLoading || isFetchingGroups || isFetchingMembers;

  return (
    <div className="flex flex-col h-full space-y-6 animate-fade-in pt-2">
        <div className="px-1">
            <h2 className="text-2xl font-semibold mb-1">Select Group & Members</h2>
            <p className="text-muted-foreground text-sm">Choose the Splitwise group and who shared this bill.</p>
        </div>

        <div className="flex-grow space-y-4 overflow-y-auto pb-24">
            <div className="px-1">
              <Label htmlFor="splitwise-group" className="text-sm font-medium text-muted-foreground block mb-1.5">Splitwise Group</Label>
              {isFetchingGroups ? (
                 <div className="flex items-center justify-center p-2 h-12 border rounded-lg bg-muted/50"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ): (
                 <Select
                  value={localSelectedGroupId ?? ""}
                  onValueChange={(value) => setLocalSelectedGroupId(value || null)}
                  disabled={isCurrentlyLoading || groups.length === 0}
                >
                  <SelectTrigger id="splitwise-group" aria-label="Select Splitwise Group" className="bg-background h-12 text-base">
                    <SelectValue placeholder="Select a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem
                        key={group.id}
                        value={group.id}
                        className="text-base dropdownItem data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary hover:bg-primary/10 hover:text-primary"
                      >
                        {group.name}
                      </SelectItem>
                    ))}
                    {groups.length === 0 && !isFetchingGroups && (
                      <SelectItem value="no-groups" disabled>
                        No groups found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {localSelectedGroupId && (
                <Card className="card-modern overflow-hidden">
                  <div className="p-4 border-b">
                    <Label className="text-sm font-medium text-muted-foreground block">Members Involved</Label>
                  </div>
                 {isFetchingMembers ? (
                      <div className="flex items-center justify-center p-4 h-48"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                 ) : (
                    <ScrollArea className="h-[calc(100dvh-400px)] sm:h-60">
                      <div className="p-2 space-y-1.5">
                        {groupMembers.length > 0 ? groupMembers.map((member) => (
                            <MemberListItem
                                key={member.id}
                                member={member}
                                isSelected={localSelectedMembers.includes(member.id)}
                                onSelect={handleMemberSelection}
                                disabled={isCurrentlyLoading}
                            />
                          )) : <p className="text-sm text-muted-foreground text-center py-4">No members found in this group.</p>}
                      </div>
                  </ScrollArea>
                 )}
              </Card>
            )}
        </div>

         <div className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto p-4 bg-background border-t border-border z-10">
             <div className="flex gap-3">
                <Button onClick={onBack} variant="outline" disabled={isCurrentlyLoading} className="w-1/3 hover:bg-primary/10 hover:text-primary">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleProceed} disabled={isProceedDisabled} className="w-2/3 hover:bg-primary/10 hover:text-primary">
                    {isCurrentlyLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Users className="mr-2 h-4 w-4" />
                    )}
                    Next: Split Items
                </Button>
             </div>
          </div>
    </div>
  );
}
