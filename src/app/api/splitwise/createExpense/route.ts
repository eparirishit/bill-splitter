import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SPLITWISE_CONFIG, APP_CONFIG } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = (await cookieStore).get(APP_CONFIG.AUTH_COOKIE_NAME)?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 401 });
    }

    const expenseData = await request.json();
    console.log('Creating expense with data:', expenseData);

    const response = await fetch(`${SPLITWISE_CONFIG.API_BASE_URL}/create_expense`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expenseData),
    });

    const data = await response.json();
    console.log('Splitwise API response:', { status: response.status, data });

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to create expense', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

