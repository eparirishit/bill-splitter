// Splitwise OAuth Configuration
export const SPLITWISE_CONFIG = {
  CLIENT_ID: process.env.SPLITWISE_CLIENT_ID!,
  CLIENT_SECRET: process.env.SPLITWISE_CLIENT_SECRET!,
  REDIRECT_URI: process.env.SPLITWISE_REDIRECT_URI!,
  AUTHORIZE_URL: process.env.SPLITWISE_AUTHORIZE_URL || 'https://secure.splitwise.com/oauth/authorize',
  TOKEN_URL: process.env.SPLITWISE_TOKEN_URL || 'https://secure.splitwise.com/oauth/token',
  API_BASE_URL: process.env.SPLITWISE_API_BASE_URL || 'https://secure.splitwise.com/api/v3.0',
} as const;

// App Configuration
export const APP_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
  AUTH_COOKIE_NAME: 'sw_access_token',
  OAUTH_STATE_COOKIE_NAME: 'oauth_state',
} as const;

// Validate required environment variables
const requiredEnvVars = ['SPLITWISE_CLIENT_ID', 'SPLITWISE_CLIENT_SECRET', 'SPLITWISE_REDIRECT_URI'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}
