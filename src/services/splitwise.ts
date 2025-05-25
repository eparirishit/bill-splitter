import type { SplitwiseGroup, SplitwiseUser, CreateExpenseProxyPayload } from '@/types';

const AUTH_SERVER_URL = process.env.NEXT_PUBLIC_AUTH_SERVER_URL;

async function fetchFromAuthServer(endpoint: string, options: RequestInit = {}) {
  if (!AUTH_SERVER_URL) {
    console.error("Auth server URL not configured");
    throw new Error("Auth server URL not configured. Please set NEXT_PUBLIC_AUTH_SERVER_URL.");
  }

  const response = await fetch(`${AUTH_SERVER_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Important to send cookies to the auth server
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { message: `Request failed with status ${response.status}`, status: response.status };
    }
    console.error(`Error fetching ${endpoint}:`, errorData);
    const err = new Error(errorData.message || errorData.error || `Failed to fetch ${endpoint}`);
    // @ts-ignore
    err.status = response.status;
    // @ts-ignore
    err.data = errorData;
    throw err;
  }
  return response.json();
}

export async function getGroups(): Promise<SplitwiseGroup[]> {
  const rawDataArray = await fetchFromAuthServer('/api/splitwise/getGroups');
  
  // Ensure rawDataArray is an array before trying to filter and map
  if (!Array.isArray(rawDataArray)) {
    console.error('Error fetching groups: Expected an array but received:', rawDataArray);
    return [];
  }

  return rawDataArray
    .filter((group: any) => group.id !== 0) // Filter out "Non-group expenses"
    .map((group: any) => {
      let processedMembers = [];
      if (Array.isArray(group.members)) {
        processedMembers = group.members.map((member: any) => {
          const firstName = member.first_name || '';
          const lastName = member.last_name || '';
          let combinedName = `${firstName} ${lastName}`.trim();
          if (!combinedName && member.email) { // Fallback to email if name is empty
            combinedName = member.email;
          } else if (!combinedName) {
            combinedName = `User ${member.id}`; // Fallback to User ID
          }
          
          return {
            id: String(member.id),
            name: combinedName,
            first_name: member.first_name || null,
            last_name: member.last_name || null,
            picture: member.picture,
          };
        });
      }
      
      return {
        id: String(group.id),
        name: group.name,
        members: processedMembers,
        // Map other relevant group properties if needed
      };
    });
}

export async function getGroupMembers(groupId: string): Promise<SplitwiseUser[]> {
  const data = await fetchFromAuthServer(`/api/splitwise/getGroup/${groupId}`);
  // Assuming proxy returns data.group.members
  if (data && data.group && Array.isArray(data.group.members)) {
    return data.group.members.map((member: any) => ({
      id: String(member.id),
      first_name: member.first_name || null,
      last_name: member.last_name || null,
      email: member.email,
      picture: member.picture,
    }));
  }
  return [];
}

export async function createExpense(expenseData: CreateExpenseProxyPayload): Promise<any> {
  return fetchFromAuthServer('/api/splitwise/createExpense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expenseData),
  });
}

export async function getCurrentSplitwiseUser(): Promise<SplitwiseUser | null> {
  try {
    const data = await fetchFromAuthServer('/api/splitwise/getCurrentUser');
    if (data && data.user) {
      return {
        id: String(data.user.id),
        first_name: data.user.first_name || null,
        last_name: data.user.last_name || null,
        email: data.user.email,
        picture: data.user.picture,
      };
    }
    return null;
  } catch (error) {
    // @ts-ignore
    if (error.status === 401) {
      console.log("Not authenticated with auth server to get current user.");
      return null;
    }
    console.error("Error fetching current Splitwise user:", error);
    throw error;
  }
}