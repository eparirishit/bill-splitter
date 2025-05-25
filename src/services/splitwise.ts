import type { SplitwiseGroup, SplitwiseUser, CreateExpense } from '@/types';

// Helper function to make API requests to our own endpoints
async function makeApiRequest(endpoint: string, options: RequestInit = {}) {
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
export async function getGroups(): Promise<SplitwiseGroup[]> {
  const data = await makeApiRequest('/api/splitwise/getGroups');
  return data.groups || [];
}

// Fetch members of a specific group
export async function getGroupMembers(groupId: string): Promise<SplitwiseUser[]> {
  const data = await makeApiRequest(`/api/splitwise/getGroup/${groupId}`);
  return data.group?.members || [];
}

// Create an expense
export async function createExpense(expense: CreateExpense): Promise<any> {
  return makeApiRequest('/api/splitwise/createExpense', {
    method: 'POST',
    body: JSON.stringify(expense),
  });
}

// Get current user info
export async function getCurrentUser(): Promise<SplitwiseUser> {
  const data = await makeApiRequest('/api/splitwise/getCurrentUser');
  return data.user;
}