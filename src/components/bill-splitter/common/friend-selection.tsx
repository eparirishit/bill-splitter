"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SplitwiseService } from "@/services/splitwise";
import type { SplitwiseFriend } from "@/types";
import { Check, Loader2, Plus, Search, UserPlus } from "lucide-react";
import * as React from "react";

interface FriendSelectionProps {
  selectedFriends: SplitwiseFriend[];
  onFriendsSelected: (friends: SplitwiseFriend[]) => void;
  disabled: boolean;
}

interface AddFriendDialogProps {
  onFriendAdded: (friend: SplitwiseFriend) => void;
  disabled: boolean;
}

const AddFriendDialog = ({ onFriendAdded, disabled }: AddFriendDialogProps) => {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleAddFriend = async () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const newFriend = await SplitwiseService.addFriend(
        email.trim(),
        firstName.trim() || undefined,
        lastName.trim() || undefined
      );
      
      onFriendAdded(newFriend);
      setOpen(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      
      toast({
        title: "Friend Added",
        description: `${newFriend.first_name || ''} ${newFriend.last_name || ''}`.trim() || 
                    newFriend.email || 'Friend' + ' has been added to your friends list.',
      });
    } catch (error) {
      console.error("Failed to add friend:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add friend. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="hover:bg-primary/10 hover:text-primary"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Friend
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Friend</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="friend-email">Email Address *</Label>
            <Input
              id="friend-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="friend-first-name">First Name</Label>
              <Input
                id="friend-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="friend-last-name">Last Name</Label>
              <Input
                id="friend-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleAddFriend} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Friend
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const FriendListItem = ({ 
  friend, 
  isSelected, 
  onSelect, 
  disabled 
}: {
  friend: SplitwiseFriend;
  isSelected: boolean;
  onSelect: (friendId: string) => void;
  disabled: boolean;
}) => (
  <div
    key={friend.id}
    onClick={() => !disabled && onSelect(friend.id)}
    className={cn(
      "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors duration-150",
      "border border-transparent",
      isSelected ? "bg-primary/10 border-primary/30" : "hover:bg-muted/60",
      disabled ? "opacity-60 cursor-not-allowed" : "tap-scale"
    )}
  >
    <span className={cn("font-medium", isSelected ? "text-primary" : "text-foreground")}>
      {friend.first_name || ''} {friend.last_name || ''}
    </span>
    {isSelected && <Check className="h-5 w-5 text-primary" />}
  </div>
);

export function FriendSelection({ selectedFriends, onFriendsSelected, disabled }: FriendSelectionProps) {
  const [friends, setFriends] = React.useState<SplitwiseFriend[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const { toast } = useToast();

  const selectedFriendIds = React.useMemo(() => 
    selectedFriends.map(f => f.id), 
    [selectedFriends]
  );

  // Filter friends based on search query
  const filteredFriends = React.useMemo(() => {
    if (!isMounted || !searchQuery.trim()) return friends;
    
    const query = searchQuery.toLowerCase();
    return friends.filter(friend => {
      const firstName = friend.first_name?.toLowerCase() || '';
      const lastName = friend.last_name?.toLowerCase() || '';
      const email = friend.email?.toLowerCase() || '';
      
      return firstName.includes(query) ||
             lastName.includes(query) ||
             email.includes(query);
    });
  }, [friends, searchQuery, isMounted]);

  const fetchFriends = async () => {
    setIsFetching(true);
    try {
      const fetchedFriends = await SplitwiseService.getFriends();
      // Sort friends alphabetically by first name, then last name
      const sortedFriends = fetchedFriends.sort((a, b) => {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setFriends(sortedFriends);
      if (sortedFriends.length === 0) {
        toast({ 
          title: "No Friends Found", 
          description: "No friends were found. Add some friends to get started.", 
          variant: "default" 
        });
      }
    } catch (error) {
      console.error("Failed to fetch friends:", error);
      toast({
        title: "Fetch Failed",
        description: "Could not fetch friends. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  React.useEffect(() => {
    setIsMounted(true);
    fetchFriends();
  }, []);

  const handleFriendSelection = (friendId: string) => {
    const friend = friends.find(f => f.id === friendId);
    if (!friend) return;

    const isSelected = selectedFriendIds.includes(friendId);
    if (isSelected) {
      onFriendsSelected(selectedFriends.filter(f => f.id !== friendId));
    } else {
      onFriendsSelected([...selectedFriends, friend]);
    }
  };

  const handleFriendAdded = (newFriend: SplitwiseFriend) => {
    setFriends(prev => {
      const updatedFriends = [newFriend, ...prev];
      // Re-sort the friends list to maintain alphabetical order
      return updatedFriends.sort((a, b) => {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
    });
    onFriendsSelected([...selectedFriends, newFriend]);
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-muted-foreground">Select Friends</Label>
          <AddFriendDialog onFriendAdded={handleFriendAdded} disabled={disabled} />
        </div>
        <Card className="card-modern overflow-hidden">
          <div className="p-4 border-b">
            <Label className="text-sm font-medium text-muted-foreground block">
              Friends (0 selected)
            </Label>
          </div>
          <div className="flex items-center justify-center p-4 h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground">Select Friends</Label>
        <AddFriendDialog onFriendAdded={handleFriendAdded} disabled={disabled} />
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            disabled={disabled || isFetching}
          />
        </div>
      </div>

      <Card className="card-modern overflow-hidden">
        <div className="p-4 border-b">
          <Label className="text-sm font-medium text-muted-foreground block">
            Friends ({selectedFriends.length} selected)
          </Label>
        </div>
        {isFetching ? (
          <div className="flex items-center justify-center p-4 h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[calc(100dvh-400px)] sm:h-60">
            <div className="p-2 space-y-1.5">
              {filteredFriends.length > 0 ? (
                filteredFriends.map((friend) => (
                  <FriendListItem
                    key={friend.id}
                    friend={friend}
                    isSelected={selectedFriendIds.includes(friend.id)}
                    onSelect={handleFriendSelection}
                    disabled={disabled}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {searchQuery ? "No friends match your search." : "No friends found."}
                </p>
              )}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
