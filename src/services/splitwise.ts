import type { CreateExpense, SplitwiseGroup, SplitwiseUser } from '@/types';

export class SplitwiseService {
  private static async makeApiRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(endpoint, {
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
    const data = await this.makeApiRequest('/api/splitwise/getGroups');
    return data.groups || [];
  }

  // Fetch members of a specific group
  static async getGroupMembers(groupId: string): Promise<SplitwiseUser[]> {
    const data = await this.makeApiRequest(`/api/splitwise/getGroup/${groupId}`);
    return data.group?.members || [];
  }

  // Create an expense
  static async createExpense(expense: CreateExpense): Promise<any> {
    return this.makeApiRequest('/api/splitwise/createExpense', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  }

  // Get current user info
  static async getCurrentUser(): Promise<SplitwiseUser> {
    const data = await this.makeApiRequest('/api/splitwise/getCurrentUser');
    return data.user;
  }

  // Validate expense data before sending to API
  static validateExpenseData(expense: CreateExpense): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!expense.cost || parseFloat(expense.cost) <= 0) {
      errors.push('Expense cost must be greater than 0');
    }

    if (!expense.description?.trim()) {
      errors.push('Expense description is required');
    }

    if (!expense.group_id) {
      errors.push('Group ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}