// Supabase client with Clerk authentication integration
// This file creates a Supabase client that automatically includes the Clerk user ID
// in RPC calls to enable Row-Level Security (RLS) policies

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useEffect, useState, useCallback } from 'react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in environment variables.');
}

// Create a basic client for non-authenticated requests
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// Create an authenticated client that passes Clerk user info via RPC parameters
class ClerkSupabaseClient {
  private client: SupabaseClient;
  private clerkUserId: string | null;
  private clerkEmail: string | null;

  constructor(client: SupabaseClient, clerkUserId: string | null, clerkEmail: string | null) {
    this.client = client;
    this.clerkUserId = clerkUserId;
    this.clerkEmail = clerkEmail;
  }

  // Wrapper for RPC calls that injects Clerk user context
  async rpc(fn: string, params: Record<string, unknown> = {}) {
    // For functions that need auth context, pass the Clerk user info
    const authFunctions = ['set_employer_context', 'get_employer_context', 'clear_employer_context', 
                          'get_employer_statistics', 'get_incidents_with_details', 'get_incidents_count'];
    
    if (authFunctions.includes(fn)) {
      // Add clerk user context to params
      return this.client.rpc(fn, {
        ...params,
        _clerk_user_id: this.clerkUserId,
        _clerk_email: this.clerkEmail
      });
    }
    
    return this.client.rpc(fn, params);
  }

  // Pass through other methods to the underlying client
  from(table: string) {
    return this.client.from(table);
  }

  storage = this.client.storage;
  auth = this.client.auth;
}

// Hook to get an authenticated Supabase client with Clerk context
export function useSupabaseClient(): ClerkSupabaseClient {
  const { userId } = useAuth();
  const { user } = useUser();
  const [client, setClient] = useState<ClerkSupabaseClient>(
    new ClerkSupabaseClient(supabaseAnon, null, null)
  );

  useEffect(() => {
    const clerkEmail = user?.primaryEmailAddress?.emailAddress || null;
    const newClient = new ClerkSupabaseClient(supabaseAnon, userId, clerkEmail);
    setClient(newClient);
  }, [userId, user]);

  return client;
}

// Export the original client for backward compatibility
// This should be replaced with useSupabaseClient() in components
export const supabase = supabaseAnon;