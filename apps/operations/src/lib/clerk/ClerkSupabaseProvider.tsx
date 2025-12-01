// src/lib/clerk/ClerkSupabaseProvider.tsx
/**
 * ClerkSupabaseProvider - Integrates Clerk authentication with Supabase
 * 
 * This provider:
 * 1. Sets up the token provider for the Supabase client (accessToken callback)
 * 2. Ensures the Clerk user exists in the Supabase users table
 * 3. Provides a clean auth context for the app
 * 
 * Uses Supabase's Third-Party Auth integration which:
 * - Does NOT require setSession() 
 * - Works with Clerk's string user IDs (not UUIDs)
 * - Passes Clerk JWTs directly to PostgREST
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import { setSupabaseTokenProvider, clearSupabaseTokenProvider, supabase } from '@/integrations/supabase/client';
import { getRoleFromEmail } from './config';

interface ClerkSupabaseProviderProps {
  children: React.ReactNode;
}

export function ClerkSupabaseProvider({ children }: ClerkSupabaseProviderProps) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const [isReady, setIsReady] = useState(false);
  const hasSetupProvider = useRef(false);
  const hasSyncedUser = useRef(false);

  // Create a stable token provider function
  const getSupabaseToken = useCallback(async (): Promise<string | null> => {
    if (!isSignedIn) {
      return null;
    }
    try {
      // Use the default Clerk session token - no template needed with Third-Party Auth
      // The token will include the standard Clerk claims including 'sub' (user ID)
      const token = await getToken();
      return token;
    } catch (error) {
      console.error('Failed to get Clerk token:', error);
      return null;
    }
  }, [isSignedIn, getToken]);

  // Set up the token provider when Clerk is ready
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && !hasSetupProvider.current) {
      console.log('🔗 Setting up Supabase token provider with Clerk');
      setSupabaseTokenProvider(getSupabaseToken);
      hasSetupProvider.current = true;
      setIsReady(true);
    } else if (!isSignedIn && hasSetupProvider.current) {
      console.log('🔓 Clearing Supabase token provider');
      clearSupabaseTokenProvider();
      hasSetupProvider.current = false;
      hasSyncedUser.current = false;
      setIsReady(true);
    } else if (!isSignedIn) {
      // Not signed in, but ready
      setIsReady(true);
    }
  }, [isLoaded, isSignedIn, getSupabaseToken]);

  // Ensure the Clerk user exists in Supabase users table
  useEffect(() => {
    const ensureUserExists = async () => {
      if (!isLoaded || !isSignedIn || !clerkUser || hasSyncedUser.current) return;

      const email = clerkUser.primaryEmailAddress?.emailAddress;
      if (!email) return;

      try {
        // Check if user exists by clerk_user_id first
        const { data: existingByClerkId } = await supabase
          .from('users')
          .select('user_id, clerk_user_id')
          .eq('clerk_user_id', clerkUser.id)
          .single();

        if (existingByClerkId) {
          console.log('✅ User found by clerk_user_id');
          hasSyncedUser.current = true;
          return;
        }

        // Check if user exists by email (legacy user without clerk_user_id)
        const { data: existingByEmail } = await supabase
          .from('users')
          .select('user_id, clerk_user_id')
          .eq('email', email)
          .single();

        if (existingByEmail) {
          // Update the existing user with their clerk_user_id
          if (!existingByEmail.clerk_user_id) {
            const { error: updateError } = await supabase
              .from('users')
              .update({ clerk_user_id: clerkUser.id, updated_at: new Date().toISOString() })
              .eq('user_id', existingByEmail.user_id);

            if (updateError) {
              console.warn('Failed to update clerk_user_id:', updateError);
            } else {
              console.log('✅ Updated existing user with clerk_user_id');
            }
          }
          hasSyncedUser.current = true;
          return;
        }

        // Create new user if doesn't exist
        const roleInfo = getRoleFromEmail(email);
        
        const { error: insertError } = await supabase.from('users').insert({
          clerk_user_id: clerkUser.id,
          email: email,
          display_name: clerkUser.fullName || clerkUser.firstName || email.split('@')[0],
          role_id: roleInfo.roleId,
          employer_id: roleInfo.employerId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        if (insertError) {
          console.error('Failed to create user:', insertError);
        } else {
          console.log('✅ Created new user in Supabase');
        }

        hasSyncedUser.current = true;
      } catch (error) {
        console.error('Error ensuring user exists:', error);
      }
    };

    ensureUserExists();
  }, [isLoaded, isSignedIn, clerkUser]);

  // Show nothing until we're ready (prevents flash)
  if (!isLoaded || !isReady) {
    return null;
  }

  return <>{children}</>;
}

