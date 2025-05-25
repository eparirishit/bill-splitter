import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SPLITWISE_CONFIG, APP_CONFIG } from '@/lib/config';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(APP_CONFIG.AUTH_COOKIE_NAME)?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const expenseData = await request.json();

  // Core fields validation
  if (!expenseData || typeof expenseData.cost !== 'number' || !expenseData.description || expenseData.group_id == null) {
    return NextResponse.json(
      { error: 'Invalid expense data payload: missing cost, description, or group_id' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${SPLITWISE_CONFIG.API_BASE_URL}/create_expense`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expenseData),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to create expense' },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
