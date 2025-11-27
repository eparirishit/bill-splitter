"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SplitwiseService } from "@/services/splitwise";
import type { SplitwiseGroup, SplitwiseUser, SplitwiseFriend, SelectionType } from "@/types";
import { ArrowLeft, Check, Loader2, Users } from "lucide-react";
import * as React from "react";
import { FriendSelection } from "./friend-selection";
import { MemberSelectionList } from "./member-selection-list";

interface GroupSelectionStepProps {
  selectedGroupId?: string | null;
  selectedMembers?: SplitwiseUser[];
  selectedFriends?: SplitwiseFriend[];
  selectionType?: SelectionType | null;
  onGroupAndMembersSelected: (groupId: string | null, members: SplitwiseUser[], friends?: SplitwiseFriend[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
  isLoading: boolean;
  onBack: () => void;
}


export function GroupSelectionStep({ 
  selectedGroupId: contextSelectedGroupId, 
  selectedMembers: contextSelectedMembers,
  selectedFriends: contextSelectedFriends,
  selectionType: contextSelectionType,
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
  const [localSelectedFriends, setLocalSelectedFriends] = React.useState<SplitwiseFriend[]>(
    contextSelectedFriends || []
  );
  const [localSelectionType, setLocalSelectionType] = React.useState<SelectionType | null>(
    contextSelectionType || 'group'
  );
  const [isFetchingGroups, setIsFetchingGroups] = React.useState(false);
  const [isFetchingMembers, setIsFetchingMembers] = React.useState(false);
  const { toast } = useToast();
  const { isAuthenticated, userId } = useAuth();

  // Update local state when context state changes
  React.useEffect(() => {
    setLocalSelectedGroupId(contextSelectedGroupId || null);
    setLocalSelectedMembers(contextSelectedMembers ? contextSelectedMembers.map(m => m.id) : []);
    setLocalSelectedFriends(contextSelectedFriends || []);
    setLocalSelectionType(contextSelectionType || 'group');
  }, [contextSelectedGroupId, contextSelectedMembers, contextSelectedFriends, contextSelectionType]);

  const fetchGroups = async () => {
    if (!isAuthenticated) return;

    onLoadingChange(true);
    setIsFetchingGroups(true);
    try {
      const fetchedGroups = await SplitwiseService.getGroups();
      setGroups(fetchedGroups);
      if (fetchedGroups.length === 0) {
           toast({ title: "No Groups Found", description: "No Splitwise groups were found.", variant: "default" });
      }
    } catch (error) {
      console.error("Splitwise fetch groups failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Fetch Failed",
        description: `Could not fetch Splitwise groups: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      onLoadingChange(false);
      setIsFetchingGroups(false);
    }
  };

  React.useEffect(() => {
    if (isAuthenticated && !groups.length && !isFetchingGroups) {
      fetchGroups();
    } else if (!isAuthenticated && groups.length === 0) {
      // Clear groups if user is not authenticated
      setGroups([]);
    }
  }, [isAuthenticated, groups.length, isFetchingGroups, fetchGroups]);

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

  const handleProceed = async () => {
    if (localSelectionType === 'group') {
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
    } else {
      if (localSelectedFriends.length === 0) {
        toast({ title: "No Friends Selected", description: "Please select at least one friend.", variant: "destructive"});
        return;
      }
      
      // Get current user and add them to the expense along with selected friends
      onLoadingChange(true);
      try {
        const currentUser = await SplitwiseService.getCurrentUser();
        
        // Check if current user is already in selected friends (shouldn't happen, but handle it)
        const currentUserInFriends = localSelectedFriends.find(f => f.id === currentUser.id.toString());
        
        // Convert friends to users for compatibility
        const friendsAsUsers: SplitwiseUser[] = localSelectedFriends.map(friend => ({
          id: friend.id,
          first_name: friend.first_name || '',
          last_name: friend.last_name || '',
          email: friend.email || '',
          registration_status: friend.registration_status,
          picture: friend.picture,
          _groupDetails: { id: '0', name: 'Friends' }
        }));
        
        // Add current user to the list if not already included
        if (!currentUserInFriends) {
          const currentUserAsUser: SplitwiseUser = {
            id: currentUser.id.toString(),
            first_name: currentUser.first_name || '',
            last_name: currentUser.last_name || '',
            email: currentUser.email || '',
            registration_status: currentUser.registration_status,
            picture: currentUser.picture,
            _groupDetails: { id: '0', name: 'Friends' }
          };
          // Add current user first, then friends
          friendsAsUsers.unshift(currentUserAsUser);
        }
        
        onGroupAndMembersSelected(null, friendsAsUsers, localSelectedFriends);
      } catch (error) {
        console.error('Failed to get current user:', error);
        toast({ 
          title: "Error", 
          description: "Failed to get your user information. Please try again.", 
          variant: "destructive"
        });
      } finally {
        onLoadingChange(false);
      }
    }
  };

  const isProceedDisabled = isLoading || 
    (localSelectionType === 'group' && (!localSelectedGroupId || localSelectedMembers.length === 0)) ||
    (localSelectionType === 'friends' && localSelectedFriends.length === 0) ||
    isFetchingGroups || isFetchingMembers;
  const isCurrentlyLoading = isLoading || isFetchingGroups || isFetchingMembers;

  return (
    <div className="flex flex-col h-full space-y-6 animate-fade-in pt-2">
        <div className="px-1">
            <h2 className="text-2xl font-semibold mb-1">Select Group & Members</h2>
            <p className="text-muted-foreground text-sm">Choose between a Splitwise group or individual friends to split this bill.</p>
        </div>

        <div className="flex-grow overflow-y-auto pb-24">
          <Tabs value={localSelectionType || 'group'} onValueChange={(value) => setLocalSelectionType(value as SelectionType)} className="px-1">
            <div className="mb-8">
              <TabsList className="flex w-full h-12 items-center justify-center rounded-xl bg-muted/20 p-1 text-muted-foreground backdrop-blur-sm border border-border/50">
                <TabsTrigger 
                  value="group"
                  className="flex-1 flex items-center justify-center whitespace-nowrap rounded-lg h-10 mx-0.5 text-sm font-semibold ring-offset-background transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-muted/30 relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Group
                  </span>
                </TabsTrigger>
                <TabsTrigger 
                  value="friends"
                  className="flex-1 flex items-center justify-center whitespace-nowrap rounded-lg h-10 mx-0.5 text-sm font-semibold ring-offset-background transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-muted/30 relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Friends
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="group" className="space-y-4 mt-0 data-[state=active]:block">
              <div>
                <Label htmlFor="splitwise-group" className="text-sm font-medium text-muted-foreground block mb-1.5">Splitwise Group</Label>
                {!isAuthenticated ? (
                  <div className="flex flex-col items-center justify-center p-4 h-12 border rounded-lg bg-muted/50 text-muted-foreground">
                    <span className="text-sm">Please connect to Splitwise to continue</span>
                  </div>
                ) : isFetchingGroups ? (
                  <div className="flex items-center justify-center p-2 h-12 border rounded-lg bg-muted/50"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : groups.length === 0 ? (
                  <div className="flex items-center justify-center p-2 h-12 border rounded-lg bg-muted/50 text-muted-foreground">
                    No groups found. Please check your Splitwise account.
                  </div>
                ) : (
                  <Select
                    value={localSelectedGroupId ?? ""}
                    onValueChange={(value) => setLocalSelectedGroupId(value || null)}
                    disabled={isCurrentlyLoading}
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
                    <MemberSelectionList
                      members={groupMembers}
                      selectedIds={localSelectedMembers}
                      onSelect={handleMemberSelection}
                      disabled={isCurrentlyLoading}
                      listHeight="h-[calc(100dvh-400px)] sm:h-60"
                      itemIdPrefix="group-member"
                      emptyMessage="No members found in this group."
                    />
                  )}
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="friends" className="space-y-4 mt-0 data-[state=active]:block">
              <FriendSelection
                selectedFriends={localSelectedFriends}
                onFriendsSelected={setLocalSelectedFriends}
                disabled={isCurrentlyLoading}
              />
            </TabsContent>
          </Tabs>
        </div>

         <div className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto p-4 bg-background border-t border-border z-20">
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
