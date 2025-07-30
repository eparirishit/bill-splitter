import type { CreateExpense, SplitwiseGroup, SplitwiseUser } from '@/types';

export class SplitwiseService {
  private static async makeApiRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(endpoint, {
      method: 'GET', // Default method
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Fetch all groups
  static async getGroups(): Promise<SplitwiseGroup[]> {
    try {
      const data = await this.makeApiRequest('/api/splitwise/getGroups');
      return data.groups || [];
    } catch (error) {
      throw new Error(`Failed to fetch groups: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Fetch a specific group
  static async getGroup(groupId: number): Promise<SplitwiseGroup> {
    try {
      const data = await this.makeApiRequest(`/api/splitwise/getGroup/${groupId}`);
      return data.group;
    } catch (error) {
      throw new Error(`Failed to fetch group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Fetch members of a specific group
  static async getGroupMembers(groupId: string): Promise<SplitwiseUser[]> {
    try {
      const data = await this.makeApiRequest(`/api/splitwise/getGroup/${groupId}`);
      return data.group?.members || [];
    } catch (error) {
      throw new Error(`Failed to fetch group members: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create an expense
  static async createExpense(expense: CreateExpense): Promise<any> {
    try {
      return await this.makeApiRequest('/api/splitwise/createExpense', {
        method: 'POST',
        body: JSON.stringify(expense),
      });
    } catch (error) {
      throw new Error(`Failed to create expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get current user info
  static async getCurrentUser(): Promise<SplitwiseUser> {
    try {
      const data = await this.makeApiRequest('/api/splitwise/getCurrentUser');
      return data.user;
    } catch (error) {
      throw new Error(`Failed to fetch current user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate expense data before sending to API
  static validateExpenseData(expense: CreateExpense): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!expense.cost) {
      errors.cost = 'Cost is required';
    } else if (isNaN(parseFloat(expense.cost))) {
      errors.cost = 'Cost must be a valid number';
    } else if (parseFloat(expense.cost) <= 0) {
      errors.cost = 'Cost must be greater than 0';
    }

    if (!expense.description?.trim()) {
      errors.description = 'Description is required';
    }

    if (!expense.group_id) {
      errors.group_id = 'Group ID is required';
    } else if (isNaN(Number(expense.group_id))) {
      errors.group_id = 'Group ID must be a valid number';
    }

    // Check for user data using dynamic keys
    const userKeys = Object.keys(expense).filter(key => key.startsWith('users__') && key.endsWith('__user_id'));
    if (userKeys.length === 0) {
      errors.users = 'At least one user must be specified';
    } else {
      // Validate each user's data
      let totalPaid = 0;
      let totalOwed = 0;
      
      for (const userKey of userKeys) {
        const userIndex = userKey.match(/users__(\d+)__user_id/)?.[1];
        if (!userIndex) continue;
        
        const userId = expense[`users__${userIndex}__user_id` as keyof CreateExpense];
        const paidShare = expense[`users__${userIndex}__paid_share` as keyof CreateExpense];
        const owedShare = expense[`users__${userIndex}__owed_share` as keyof CreateExpense];
        
        if (!userId || !paidShare || !owedShare) {
          errors.users = 'User data is invalid';
          break;
        }
        
        // Check if user ID is valid
        if (isNaN(Number(userId))) {
          errors.users = 'User data is invalid';
          break;
        }
        
        totalPaid += parseFloat(paidShare as string);
        totalOwed += parseFloat(owedShare as string);
      }
      
      // Check if total paid share equals total owed share
      if (Math.abs(totalPaid - totalOwed) > 0.01) {
        errors.shares = 'Total paid share must equal total owed share';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Format expense data for API submission
  static formatExpensePayload(expenseData: {
    cost: number;
    description: string;
    group_id: number;
    split_equally: boolean;
    users: Array<{ id: number; first_name: string; last_name: string }>;
    customAmounts?: Record<string, number>;
  }): CreateExpense {
    const payload: any = {
      cost: expenseData.cost.toFixed(2),
      description: expenseData.description,
      group_id: expenseData.group_id,
      split_equally: expenseData.split_equally
    };

    if (expenseData.split_equally) {
      // Equal split - first user pays full amount, others pay 0
      const sharePerUser = expenseData.cost / expenseData.users.length;
      
      expenseData.users.forEach((user, index) => {
        payload[`users__${index}__user_id`] = user.id;
        payload[`users__${index}__paid_share`] = index === 0 ? expenseData.cost.toFixed(2) : '0.00';
        payload[`users__${index}__owed_share`] = sharePerUser.toFixed(2);
      });
    } else {
      // Custom split
      const customAmounts = expenseData.customAmounts || {};
      
      expenseData.users.forEach((user, index) => {
        payload[`users__${index}__user_id`] = user.id;
        payload[`users__${index}__paid_share`] = index === 0 ? expenseData.cost.toFixed(2) : '0.00';
        payload[`users__${index}__owed_share`] = (customAmounts[user.id.toString()] || 0).toFixed(2);
      });
    }

    return payload as CreateExpense;
  }
}