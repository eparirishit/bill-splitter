/**
 * Server-only configuration — contains API keys and secrets that must NEVER
 * reach the client bundle. Importing this file from a Client Component will
 * cause a build-time error thanks to the `server-only` guard.
 */
import 'server-only';

import { ProviderType } from '@/ai/ai-service-factory';

/**
 * AI provider secrets. Use this in server-side code (API routes, Server
 * Actions, AI extraction pipeline) instead of AI_CONFIG for anything that
 * involves API keys.
 */
export const AI_SERVER_CONFIG = {
    PROVIDER: (process.env.AI_PROVIDER || 'google-gemini') as ProviderType,

    GOOGLE_GEMINI: {
        MODEL_NAME: process.env.GOOGLE_MODEL_NAME || 'gemini-2.5-flash',
        API_KEY: process.env.GOOGLE_API_KEY!,
        TEMPERATURE: 0.1,
        MAX_TOKENS: 8192,
    },

    OPENROUTER: {
        MODEL_NAME:
            process.env.OPENROUTER_MODEL_NAME || 'anthropic/claude-3.5-sonnet',
        API_KEY: process.env.OPENROUTER_API_KEY!,
        BASE_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        TEMPERATURE: 0.1,
        MAX_TOKENS: 8192,
    },
} as const;
