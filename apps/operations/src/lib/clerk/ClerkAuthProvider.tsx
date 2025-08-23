import React, { createContext, useContext, useEffect, useState } from 'react';
import { ClerkProvider, useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { UserData } from '@/lib/auth/roles';
import { getRoleFromEmail } from './config';
import { useNavigate } from 'react-router-dom';

interface ClerkAuthContextType {
  user: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const ClerkAuthContext = createContext<ClerkAuthContextType | undefined>(undefined);

export function useClerkAuthContext() {
  const context = useContext(ClerkAuthContext);
  if (!context) {
    throw new Error('useClerkAuthContext must be used within ClerkAuthProvider');
  }
  return context;
}

interface ClerkAuthProviderProps {
  children: React.ReactNode;
}

function ClerkAuthSync({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync Clerk user with Supabase database
  useEffect(() => {
    const syncUserData = async () => {
      if (!isLoaded) return;
      
      setIsLoading(true);
      setError(null);

      try {
        if (isSignedIn && clerkUser) {
          // Get role based on email
          const roleInfo = getRoleFromEmail(clerkUser.primaryEmailAddress?.emailAddress || '');
          
          // Check if user exists in Supabase
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select(`
              *,
              role:user_roles!inner(*)
            `)
            .eq('email', clerkUser.primaryEmailAddress?.emailAddress)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
          }

          let supabaseUser = existingUser;

          // If user doesn't exist, create them
          if (!existingUser) {
            // Generate a proper UUID v4
            const generateUUID = () => {
              if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
              }
              // Fallback for older browsers
              return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
              });
            };

            const { data: newUser, error: createError } = await supabase
              .from('users')
              .insert({
                user_id: generateUUID(), // Generate proper UUID for now
                email: clerkUser.primaryEmailAddress?.emailAddress,
                display_name: clerkUser.fullName || clerkUser.primaryEmailAddress?.emailAddress,
                role_id: roleInfo.role_id,
                custom_display_name: clerkUser.fullName,
                clerk_user_id: clerkUser.id,
              })
              .select(`
                *,
                role:user_roles!inner(*)
              `)
              .single();

            if (createError) {
              console.error('Error creating user:', createError);
              throw createError;
            }

            supabaseUser = newUser;
          } else {
            // Update user's clerk_user_id and display name if needed
            // IMPORTANT: Only update if values have actually changed to prevent infinite loops
            const needsUpdate = existingUser.clerk_user_id !== clerkUser.id || 
                               (clerkUser.fullName && existingUser.custom_display_name !== clerkUser.fullName);
            
            if (needsUpdate) {
              const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update({ 
                  clerk_user_id: clerkUser.id,
                  custom_display_name: clerkUser.fullName || existingUser.custom_display_name
                })
                .eq('email', clerkUser.primaryEmailAddress?.emailAddress)
                .select(`
                  *,
                  role:user_roles!inner(*)
                `)
                .single();

              if (updateError) {
                console.error('Error updating user:', updateError);
                throw updateError;
              }

              supabaseUser = updatedUser;
            }
          }

          // Set user data in context
          setUserData(supabaseUser as UserData);
        } else {
          setUserData(null);
        }
      } catch (err) {
        console.error('Error syncing user data:', err);
        setError(err instanceof Error ? err.message : 'Failed to sync user data');
        setUserData(null);
      } finally {
        setIsLoading(false);
      }
    };

    syncUserData();
  }, [isLoaded, isSignedIn, clerkUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (email: string, password: string) => {
    // This will be handled by Clerk's SignIn component
    throw new Error('Use Clerk SignIn component for authentication');
  };

  const signOut = async () => {
    try {
      // Sign out from Clerk (handled by Clerk's button)
      setUserData(null);
      navigate('/auth/clerk-login');
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    }
  };

  const contextValue: ClerkAuthContextType = {
    user: userData,
    isLoading: !isLoaded || isLoading,
    isAuthenticated: isSignedIn && !!userData,
    signIn,
    signOut,
    error,
  };

  return (
    <ClerkAuthContext.Provider value={contextValue}>
      {children}
    </ClerkAuthContext.Provider>
  );
}

export function ClerkAuthProvider({ children }: ClerkAuthProviderProps) {
  const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!clerkPublishableKey) {
    console.error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment variables');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">
          Missing Clerk configuration. Please add VITE_CLERK_PUBLISHABLE_KEY to your .env file.
        </div>
      </div>
    );
  }

  // Add error boundary and session cleanup
  const handleError = (error: Error) => {
    console.error('Clerk initialization error:', error);
    // Clear any stale session data
    if (typeof window !== 'undefined') {
      // Clear Clerk cookies and localStorage
      document.cookie.split(";").forEach((c) => {
        if (c.includes('__clerk') || c.includes('__session')) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        }
      });
      // Clear localStorage items
      Object.keys(localStorage).forEach(key => {
        if (key.includes('clerk') || key.includes('__clerk')) {
          localStorage.removeItem(key);
        }
      });
      // Reload to get fresh state
      // window.location.reload(); // Commented out - may cause crashes
    }
  };

  return (
    <ClerkProvider 
      publishableKey={clerkPublishableKey}
      appearance={{
        elements: {
          rootBox: "mx-auto",
        },
      }}
    >
      <ClerkAuthSync>{children}</ClerkAuthSync>
    </ClerkProvider>
  );
}