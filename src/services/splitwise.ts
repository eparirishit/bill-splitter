import { APP_CONFIG } from "@/lib/config";
import type { SplitwiseGroup, SplitwiseUser, CreateExpense } from "@/types";

// Helper function to get access token from cookies
export async function getAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    // Server-side: Cannot access cookies directly, return null
    // Server-side API routes should handle authentication differently
    return null;
  } else {
    // Client-side: get from document cookies
    const cookies = document.cookie.split(";");
    const tokenCookie = cookies.find((cookie) =>
      cookie.trim().startsWith(`${APP_CONFIG.AUTH_COOKIE_NAME}=`)
    );

    if (tokenCookie) {
      const token = tokenCookie.split("=")[1];
      return token ? decodeURIComponent(token) : null;
    }

    return null;
  }
}

// Helper function to make API requests to our own endpoints
async function makeApiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
  const data = await makeApiRequest("/api/splitwise/getGroups");
  return data.groups || [];
}

// Fetch members of a specific group
export async function getGroupMembers(
  groupId: string
): Promise<SplitwiseUser[]> {
  const data = await makeApiRequest(`/api/splitwise/getGroup/${groupId}`);
  return data.group?.members || [];
}

// Create an expense - use our API endpoint instead of direct Splitwise API
export async function createExpense(expense: CreateExpense) {
  try {
    console.log("Creating expense with payload:", expense);

    // Use our API endpoint which handles authentication server-side
    const response = await fetch("/api/splitwise/createExpense", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(expense),
    });

    console.log("API response status:", response.status);

    const data = await response.json();
    console.log("API response data:", data);

    if (!response.ok) {
      throw new Error(
        data.error || `HTTP ${response.status}: API request failed`
      );
    }

    return data;
  } catch (error) {
    console.error("Error creating expense:", error);
    throw error;
  }
}

// Get current user info
export async function getCurrentUser(): Promise<SplitwiseUser> {
  const data = await makeApiRequest("/api/splitwise/getCurrentUser");
  return data.user;
}
