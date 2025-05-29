import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { SPLITWISE_CONFIG } from '@/lib/config';

const oauthStates = new Map();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const state = crypto.randomBytes(16).toString('hex');
  oauthStates.set(state, true);

  const authUrl = new URL(SPLITWISE_CONFIG.AUTHORIZE_URL);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', SPLITWISE_CONFIG.CLIENT_ID!);
  authUrl.searchParams.append('redirect_uri', SPLITWISE_CONFIG.REDIRECT_URI!);
  authUrl.searchParams.append('state', state);
  
  res.redirect(authUrl.toString());
}