import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const oauthStates = new Map();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const state = crypto.randomBytes(16).toString('hex');
  oauthStates.set(state, true);

  const authUrl = new URL('https://secure.splitwise.com/oauth/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.SPLITWISE_CLIENT_ID!);
  authUrl.searchParams.append('redirect_uri', process.env.SPLITWISE_REDIRECT_URI!);
  authUrl.searchParams.append('state', state);
  
  res.redirect(authUrl.toString());
}