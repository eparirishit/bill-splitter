import { getGroups, getGroupMembers } from '@/services/splitwise';
import type { SplitwiseGroup, SplitwiseUser } from '@/types';

export interface GroupWithMembers extends SplitwiseGroup {
    memberCount: number;
}

export class GroupService {
    /**
     * Fetch all available groups
     */
    static async fetchGroups(): Promise<SplitwiseGroup[]> {
        try {
            return await getGroups();
        } catch (error) {
            console.error('Error fetching groups:', error);
            throw new Error('Failed to load groups. Please check your connection and try again.');
        }
    }

    /**
     * Fetch members for a specific group
     */
    static async fetchGroupMembers(groupId: string): Promise<SplitwiseUser[]> {
        try {
            return await getGroupMembers(groupId);
        } catch (error) {
            console.error('Error fetching group members:', error);
            throw new Error('Failed to load group members. Please try again.');
        }
    }

    /**
     * Prepare groups with member count for display
     */
    static prepareGroupsForDisplay(groups: SplitwiseGroup[]): GroupWithMembers[] {
        return groups.map(group => ({
            ...group,
            memberCount: group.members?.length || 0
        }));
    }

    /**
     * Validate group and member selection
     */
    static validateGroupSelection(
        selectedGroupId: string | null,
        selectedMemberIds: string[],
        availableMembers: SplitwiseUser[]
    ): { isValid: boolean; error?: string } {
        if (!selectedGroupId) {
            return { isValid: false, error: "Please select a group." };
        }

        if (selectedMemberIds.length === 0) {
            return { isValid: false, error: "Please select at least one member to split the expense." };
        }

        if (selectedMemberIds.length > availableMembers.length) {
            return { isValid: false, error: "Invalid member selection." };
        }

        return { isValid: true };
    }

    /**
     * Prepare selected members with group details
     */
    static prepareSelectedMembers(
        selectedMemberIds: string[],
        availableMembers: SplitwiseUser[],
        groupId: string,
        groupName: string
    ): SplitwiseUser[] {
        return selectedMemberIds
            .map(id => availableMembers.find(member => member.id === id))
            .filter((member): member is SplitwiseUser => member !== undefined)
            .map(member => ({
                ...member,
                _groupDetails: { id: groupId, name: groupName }
            }));
    }
}
