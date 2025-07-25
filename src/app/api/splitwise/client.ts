import { SPLITWISE_CONFIG } from '@/lib/config';

export class SplitwiseAPIClient {
  constructor(private accessToken: string) {}

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${SPLITWISE_CONFIG.API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new SplitwiseAPIError(
        data.message || `HTTP ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  }

  async getGroups() {
    return this.makeRequest('/get_groups');
  }

  async getGroup(groupId: string) {
    return this.makeRequest(`/get_group/${groupId}`);
  }

  async getCurrentUser() {
    return this.makeRequest('/get_current_user');
  }

  async createExpense(expenseData: unknown) {
    return this.makeRequest('/create_expense', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  }
}

export class SplitwiseAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SplitwiseAPIError';
  }
}
