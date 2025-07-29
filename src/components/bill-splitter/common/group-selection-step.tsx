"use client";

import * as React from "react";
import { Users, Loader2, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getGroups, getGroupMembers } from "@/services/splitwise";
import type { SplitwiseGroup, SplitwiseUser } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface GroupSelectionStepProps {
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

export function GroupSelectionStep({ onGroupAndMembersSelected, onLoadingChange, isLoading, onBack }: GroupSelectionStepProps) {
  const [groups, setGroups] = React.useState<SplitwiseGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);
  const [groupMembers, setGroupMembers] = React.useState<SplitwiseUser[]>([]);
  const [selectedMembers, setSelectedMembers] = React.useState<string[]>([]);
  const [isFetchingGroups, setIsFetchingGroups] = React.useState(false);
  const [isFetchingMembers, setIsFetchingMembers] = React.useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    const fetchGroups = async () => {
      if (!isAuthenticated) return;

      onLoadingChange(true);
      setIsFetchingGroups(true);
      try {
        const fetchedGroups = await getGroups();
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
      if (selectedGroupId && isAuthenticated) {
        console.log("Selected groupId:", selectedGroupId);
        onLoadingChange(true);
        setIsFetchingMembers(true);
        setGroupMembers([]);
        setSelectedMembers([]);
        try {
          const members = await getGroupMembers(selectedGroupId);
          console.log("Fetched members for group", selectedGroupId, ":", members);
          setGroupMembers(members);
          setSelectedMembers(members.map(m => m.id));
        } catch (error) {
          console.error("Error fetching group members:", error);
          toast({
            title: "Fetch Failed",
            description: "Could not fetch group members.",
            variant: "destructive",
          });
          setGroupMembers([]);
          setSelectedMembers([]);
        } finally {
          onLoadingChange(false);
          setIsFetchingMembers(false);
        }
      } else {
        setGroupMembers([]);
        setSelectedMembers([]);
      }
    };
    fetchMembers();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId, isAuthenticated]);

  const handleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleProceed = () => {
    if (!selectedGroupId) {
        toast({ title: "No Group Selected", description: "Please select a group.", variant: "destructive"});
        return;
    }
    if (selectedMembers.length === 0) {
        toast({ title: "No Members Selected", description: "Please select at least one member.", variant: "destructive"});
        return;
    }
    const finalSelectedUsers = groupMembers.filter(member => selectedMembers.includes(member.id));
    onGroupAndMembersSelected(selectedGroupId, finalSelectedUsers);
  };

  const isProceedDisabled = isLoading || !selectedGroupId || selectedMembers.length === 0 || isFetchingGroups || isFetchingMembers;
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
                  value={selectedGroupId ?? ""}
                  onValueChange={(value) => setSelectedGroupId(value || null)}
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

            {selectedGroupId && (
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
                                isSelected={selectedMembers.includes(member.id)}
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
