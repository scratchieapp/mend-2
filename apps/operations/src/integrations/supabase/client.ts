// src/integrations/supabase/client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in environment variables.');
}

// Token provider function - will be set by ClerkSupabaseProvider
let tokenProvider: (() => Promise<string | null>) | null = null;

/**
 * Set the token provider function for the Supabase client.
 * This should be called once when the ClerkSupabaseProvider mounts.
 */
export function setSupabaseTokenProvider(provider: () => Promise<string | null>) {
  tokenProvider = provider;
}

/**
 * Clear the token provider (on sign out)
 */
export function clearSupabaseTokenProvider() {
  tokenProvider = null;
}

/**
 * Supabase client configured for Third-Party Auth with Clerk.
 * 
 * This uses the `accessToken` callback pattern which:
 * - Passes the Clerk JWT directly to PostgREST/Realtime
 * - Does NOT use Supabase Auth (GoTrue) sessions
 * - Works with non-UUID `sub` claims
 * 
 * @see https://supabase.com/docs/guides/auth/third-party/clerk
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable all Supabase Auth features - we're using Clerk
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      // Default headers - the Authorization header will be set dynamically
    },
  },
  // The accessToken callback is the key to Third-Party Auth
  // It's called before every request to get a fresh token
  accessToken: async () => {
    if (tokenProvider) {
      try {
        const token = await tokenProvider();
        return token;
      } catch (error) {
        console.warn('Failed to get Clerk token for Supabase:', error);
        return null;
      }
    }
    return null;
  },
});

// Expose supabase in the browser for dev-only performance instrumentation
if (typeof window !== 'undefined') {
  // Attach without breaking production; PerformanceMonitor will guard usage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).supabase = supabase;
}
