require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3030;

// Configure CORS
const corsOptions = {
  origin: process.env.NEXTJS_FRONTEND_URL, // Allow requests from your Next.js app
  credentials: true, // Allow cookies to be sent and received
};
app.use(cors(corsOptions));

app.use(cookieParser());

const SPLITWISE_CLIENT_ID = process.env.SPLITWISE_CLIENT_ID;
const SPLITWISE_CLIENT_SECRET = process.env.SPLITWISE_CLIENT_SECRET;
const SPLITWISE_REDIRECT_URI = process.env.SPLITWISE_REDIRECT_URI;
const NEXTJS_FRONTEND_URL = process.env.NEXTJS_FRONTEND_URL;

const SPLITWISE_AUTHORIZE_URL = 'https://secure.splitwise.com/oauth/authorize';
const SPLITWISE_TOKEN_URL = 'https://secure.splitwise.com/oauth/token';

// Store state temporarily (in a real app, use a session store)
const oauthStates = new Map();

app.get('/auth/splitwise/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  oauthStates.set(state, true); // Store state to validate later

  const authUrl = new URL(SPLITWISE_AUTHORIZE_URL);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', SPLITWISE_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', SPLITWISE_REDIRECT_URI);
  authUrl.searchParams.append('state', state);
  // Add any scopes if needed, e.g. authUrl.searchParams.append('scope', 'read write');
  
  console.log(`Redirecting to Splitwise for auth: ${authUrl.toString()}`);
  res.redirect(authUrl.toString());
});

app.get('/auth/splitwise/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error('Splitwise callback error:', error);
    return res.redirect(`${NEXTJS_FRONTEND_URL}/login?error=${encodeURIComponent(error)}`);
  }

  if (!oauthStates.has(state)) {
    console.error('Invalid OAuth state received.');
    return res.redirect(`${NEXTJS_FRONTEND_URL}/login?error=invalid_state`);
  }
  oauthStates.delete(state); // State used, remove it

  if (!code) {
    console.error('No code received in Splitwise callback.');
    return res.redirect(`${NEXTJS_FRONTEND_URL}/login?error=no_code`);
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', SPLITWISE_REDIRECT_URI);
    params.append('client_id', SPLITWISE_CLIENT_ID);
    params.append('client_secret', SPLITWISE_CLIENT_SECRET);

    console.log('Auth Server: Attempting token exchange.');
    console.log('Auth Server: Using Client ID:', SPLITWISE_CLIENT_ID);
    // TEMPORARY LOGGING: Log a portion of the client secret to verify it's loaded.
    // REMOVE THIS LOG IN PRODUCTION OR IF SHARING LOGS.
    if (SPLITWISE_CLIENT_SECRET) {
      console.log('Auth Server: Using Client Secret (first 5 chars):', SPLITWISE_CLIENT_SECRET.substring(0, 5));
    } else {
      console.error('Auth Server: CRITICAL - SPLITWISE_CLIENT_SECRET is not loaded from .env!');
    }
    console.log('Auth Server: Using Redirect URI for token exchange:', SPLITWISE_REDIRECT_URI);
    console.log('Auth Server: Sending code:', code);


    console.log('Exchanging code for token with params (secret redacted in this specific log for safety):', {
        grant_type: 'authorization_code', code, redirect_uri: SPLITWISE_REDIRECT_URI, client_id: SPLITWISE_CLIENT_ID, client_secret_loaded: !!SPLITWISE_CLIENT_SECRET
    });

    const tokenResponse = await fetch(SPLITWISE_TOKEN_URL, {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const tokenData = await tokenResponse.json();
    console.log('Token response status:', tokenResponse.status);
    console.log('Token data received:', tokenData);

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Error exchanging token:', tokenData.error || `Status ${tokenResponse.status}`);
      return res.redirect(`${NEXTJS_FRONTEND_URL}/login?error=${encodeURIComponent(tokenData.error || 'token_exchange_failed')}`);
    }

    // Securely set the access token in an HttpOnly cookie
    res.cookie('sw_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      maxAge: tokenData.expires_in ? tokenData.expires_in * 1000 : 3600 * 1000, // e.g. 1 hour
      // path: '/', // Cookie available for all paths
      // sameSite: 'lax' // Mitigates CSRF
    });
    
    console.log('Access token set in cookie. Redirecting to frontend.');
    res.redirect(NEXTJS_FRONTEND_URL); // Redirect to your Next.js app's home page

  } catch (err) {
    console.error('Exception during token exchange:', err);
    res.redirect(`${NEXTJS_FRONTEND_URL}/login?error=server_exception`);
  }
});

// Endpoint to check authentication status (optional, useful for client)
app.get('/auth/status', (req, res) => {
  if (req.cookies.sw_access_token) {
    res.json({ isAuthenticated: true });
  } else {
    res.json({ isAuthenticated: false });
  }
});

app.get('/auth/logout', (req, res) => {
  res.clearCookie('sw_access_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  // Optionally, call Splitwise logout endpoint if available, or revoke token
  console.log('User logged out, cookie cleared.');
  res.redirect(NEXTJS_FRONTEND_URL + '/login');
});

// Proxy for Splitwise API calls (Example: get current user)
app.get('/api/splitwise/getCurrentUser', async (req, res) => {
    const accessToken = req.cookies.sw_access_token;
    if (!accessToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        const apiRes = await fetch('https://secure.splitwise.com/api/v3.0/get_current_user', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await apiRes.json();
        if (!apiRes.ok) {
            throw new Error(data.error || 'Failed to fetch current user');
        }
        res.json(data); // API returns { user: { ... } }
    } catch (error) {
        console.error('Error proxying to Splitwise get_current_user:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch data from Splitwise' });
    }
});

// getGroups using Splitwise REST API
app.get('/api/splitwise/getGroups', async (req, res) => {
    const accessToken = req.cookies.sw_access_token;
    if (!accessToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        const apiRes = await fetch('https://secure.splitwise.com/api/v3.0/get_groups', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await apiRes.json();
        if (!apiRes.ok) {
            throw new Error(data.error || 'Failed to fetch groups');
        }
        res.json(data.groups); // API returns { groups: [...] }
    } catch (error) {
        console.error('Error proxying getGroups:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch groups' });
    }
});

// getGroupMembers using Splitwise REST API
app.get('/api/splitwise/getGroup/:groupId', async (req, res) => {
    const accessToken = req.cookies.sw_access_token;
    const { groupId } = req.params;

    if (!accessToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!groupId) {
        return res.status(400).json({ error: 'Group ID is required' });
    }

    try {
        const apiRes = await fetch(`https://secure.splitwise.com/api/v3.0/get_group?id=${groupId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await apiRes.json();
        if (!apiRes.ok) {
            throw new Error(data.error || 'Failed to fetch group');
        }
        if (!data.group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        res.json(data); // API returns { group: { ... } }
    } catch (error) {
        console.error(`Error proxying getGroup for ID ${groupId}:`, error);
        res.status(500).json({ error: error.message || 'Failed to fetch group details' });
    }
});

app.use(express.json()); // Ensure this is before your POST route

app.post('/api/splitwise/createExpense', async (req, res) => {
    const accessToken = req.cookies.sw_access_token;
    if (!accessToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const expenseData = req.body; // This is CreateExpenseProxyPayload from client

    // Core fields validation
    if (!expenseData || typeof expenseData.cost !== 'number' || !expenseData.description || expenseData.group_id == null) { // check group_id for null/undefined
        return res.status(400).json({ error: 'Invalid expense data payload: missing cost, description, or group_id' });
    }

    // Conditional validation for users array based on split_equally flag
    if (expenseData.split_equally === true) {
        // If splitting equally, client might not send users array.
        // Splitwise API will handle distribution among all group members.
    } else {
        // If not splitting equally (i.e., split_equally is false or undefined),
        // the users array with specific shares is mandatory.
        if (!Array.isArray(expenseData.users) || expenseData.users.length === 0) {
            return res.status(400).json({ error: 'Invalid expense data payload: users array is required and cannot be empty for custom splits.' });
        }
        for (const user of expenseData.users) {
            if (user.user_id == null || typeof user.paid_share !== 'number' || typeof user.owed_share !== 'number') {
                return res.status(400).json({ error: 'Invalid expense data payload: each user in users array must have user_id (number), paid_share (number), and owed_share (number).' });
            }
        }
    }

    try {
        // Construct the payload for the Splitwise API
        const paramsForSplitwiseAPI = {
            group_id: Number(expenseData.group_id), // Ensure group_id is a number
            description: expenseData.description,
            cost: expenseData.cost.toString(), // API expects cost as string
            payment: expenseData.payment === true, // Default to false if undefined
            currency_code: 'USD', // Set default currency to USD
        };

        // Add optional fields if they are present in the client payload
        if (expenseData.date) paramsForSplitwiseAPI.date = expenseData.date; // Expected format YYYY-MM-DD
        if (expenseData.details) paramsForSplitwiseAPI.details = expenseData.details;
        if (expenseData.category_id != null) paramsForSplitwiseAPI.category_id = Number(expenseData.category_id); // Ensure category_id is a number

        if (expenseData.split_equally === true) {
            paramsForSplitwiseAPI.split_equally = true;
        } else {
            // If not splitting equally, add user-specific shares.
            // The 'users' array has been validated to exist and be non-empty.
            expenseData.users.forEach((user, index) => {
                paramsForSplitwiseAPI[`users__${index}__user_id`] = Number(user.user_id);
                paramsForSplitwiseAPI[`users__${index}__paid_share`] = parseFloat(user.paid_share).toFixed(2);
                paramsForSplitwiseAPI[`users__${index}__owed_share`] = parseFloat(user.owed_share).toFixed(2);
            });
        }
        
        console.log("Auth Server: Creating expense with params for Splitwise API:", JSON.stringify(paramsForSplitwiseAPI, null, 2));
        const apiRes = await fetch('https://secure.splitwise.com/api/v3.0/create_expense', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paramsForSplitwiseAPI)
        });

        const responseData = await apiRes.json();

        if (!apiRes.ok) { // Check HTTP status code first
            console.error('Splitwise API Error on create_expense. Status:', apiRes.status, 'Response:', responseData);
            let errorMessage = 'Failed to create expense on Splitwise.';
            // Try to parse more specific errors from Splitwise
            if (responseData.errors) {
                const errorMessages = [];
                for (const key in responseData.errors) {
                    if (Array.isArray(responseData.errors[key])) {
                        errorMessages.push(`${key}: ${responseData.errors[key].join(', ')}`);
                    } else {
                        errorMessages.push(`${key}: ${responseData.errors[key]}`);
                    }
                }
                errorMessage = errorMessages.length > 0 ? errorMessages.join('; ') : JSON.stringify(responseData.errors);
            } else if (responseData.error) { // General error field
                errorMessage = responseData.error;
            }
            
            return res.status(apiRes.status).json({ // Use Splitwise's status code
                error: "Splitwise API request failed.", 
                details: errorMessage,
                splitwiseResponse: responseData
            });
        }

        // If apiRes.ok is true, it's a success.
        // The Splitwise API for create_expense should return an `expenses` array on success.
        if (responseData.expenses && Array.isArray(responseData.expenses)) {
            console.log("Auth Server: Expense created successfully on Splitwise.");
            res.json(responseData); // Forward the successful response
        } else {
            // This case should ideally not happen if apiRes.ok is true and API conforms to docs.
            // But as a safeguard:
            console.error('Splitwise API Success Status but unexpected response format:', responseData);
            res.status(500).json({
                error: "Splitwise API returned success status but unexpected data format.",
                details: "Expected 'expenses' array in response.",
                splitwiseResponse: responseData
            });
        }

    } catch (error) {
        console.error('Error proxying createExpense:', error);
        res.status(500).json({ 
            error: "Server error while creating expense.", 
            details: error.message 
        });
    }
});


app.listen(port, () => {
  console.log(`Splitwise Auth Server listening at http://localhost:${port}`);
});