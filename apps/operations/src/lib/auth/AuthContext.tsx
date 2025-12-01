// src/lib/auth/AuthContext.tsx
/**
 * AuthContext - Provides authentication state for the application
 * 
 * This context works with Clerk for authentication and Supabase for data.
 * With Supabase Third-Party Auth, we NO LONGER use setSession().
 * The Clerk JWT is passed directly to Supabase via the accessToken callback.
 * 
 * @see ClerkSupabaseProvider for the token integration
 */
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { errorLogger, logAuthError } from "@/lib/monitoring/errorLogger";
import { useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/clerk-react";

// User role type matching database structure
type UserRole = {
  role_id: number;
  role_name: string;
  role_label: string;
};

// User data from our database
type UserData = {
  user_id: string;
  email?: string | null;
  display_name?: string | null;
  custom_display_name?: string | null;
  role_id?: number | null;
  employer_id?: string | null;
  employer_name?: string | null;
  site_id?: string | null;
  mobile_number?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_seen_at?: string | null;
  role?: UserRole;
};

// Auth context type with consistent naming
type AuthContextType = {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // User data
  clerkUserId: string | null;  // The Clerk user ID (sub claim)
  userData: UserData | null;   // Our database user data
  
  // Actions
  signOut: () => Promise<void>;
  updateUserData: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Clerk authentication state
  const { isLoaded: clerkLoaded, isSignedIn: clerkSignedIn, userId: clerkUserId, signOut: clerkSignOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  
  // Core auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // User data from our database
  const [userData, setUserData] = useState<UserData | null>(null);
  
  // Refs to prevent duplicate fetches
  const lastFetchedClerkId = useRef<string | null>(null);
  const isUpdatingUserData = useRef(false);

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch user data from database
  const updateUserData = useCallback(async () => {
    // Prevent concurrent updates
    if (isUpdatingUserData.current) {
      return;
    }

    if (!clerkSignedIn || !clerkUserId || !clerkUser) {
      if (userData !== null) {
        setUserData(null);
      }
      return;
    }

    const currentEmail = clerkUser.primaryEmailAddress?.emailAddress;
    
    // Skip if we already fetched for this user
    if (clerkUserId === lastFetchedClerkId.current && userData) {
      return;
    }

    isUpdatingUserData.current = true;

    try {
      // Try clerk_user_id lookup first
      let { data, error: rpcError } = await supabase
        .rpc('get_user_profile_by_clerk_id', {
          p_clerk_user_id: clerkUserId
        })
        .single();

      // If clerk_user_id lookup fails, try email fallback
      if (rpcError || !data) {
        if (import.meta.env.DEV) {
          console.warn("Clerk ID lookup failed, trying email fallback:", rpcError?.message || "no data");
        }
        
        if (currentEmail) {
          const emailResult = await supabase
            .rpc('get_user_profile_by_email', {
              p_email: currentEmail
            })
            .single();
          
          if (!emailResult.error && emailResult.data) {
            data = emailResult.data;
            rpcError = null;
            
            // Update the clerk_user_id in the database for future lookups
            try {
              await supabase.rpc('update_clerk_user_id', {
                p_email: currentEmail,
                p_clerk_user_id: clerkUserId
              });
            } catch (updateErr) {
              console.warn("Failed to update clerk_user_id:", updateErr);
            }
          }
        }
      }

      if (!rpcError && data) {
        // Map flat RPC result to nested structure expected by UserData
        const processedData: UserData = {
          user_id: data.user_id,
          email: data.email,
          display_name: data.display_name,
          custom_display_name: data.custom_display_name,
          role_id: data.role_id,
          employer_id: data.employer_id ? String(data.employer_id) : null,
          employer_name: data.employer_name || null,
          site_id: data.site_id ? String(data.site_id) : null,
          mobile_number: data.mobile_number || null,
          created_at: data.created_at,
          updated_at: data.updated_at,
          last_seen_at: data.last_seen_at,
          role: {
            role_id: data.role_id,
            role_name: data.role_name,
            role_label: data.role_label
          }
        };
        
        setUserData(processedData);
        lastFetchedClerkId.current = clerkUserId;
        clearError();
        
        // Set user context for error logging
        errorLogger.setUserContext(
          processedData.user_id, 
          processedData.role?.role_name
        );
      } else {
        const errorMsg = "User profile not found. Please contact support.";
        setError(errorMsg);
        logAuthError('fetch-user-data', errorMsg, { clerkUserId, email: currentEmail });
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      logAuthError('update-user-data', err instanceof Error ? err : String(err));
    } finally {
      isUpdatingUserData.current = false;
    }
  }, [clerkSignedIn, clerkUserId, clerkUser, userData, clearError]);

  // Sign out
  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      // Clear employer context before signing out
      await supabase.rpc('clear_employer_context').catch(err => {
        console.warn('Failed to clear employer context:', err);
      });
      
      // Sign out of Clerk
      await clerkSignOut();
      
      // Clear all state
      setUserData(null);
      setIsAuthenticated(false);
      lastFetchedClerkId.current = null;
      clearError();
      
      // Clear localStorage
      localStorage.removeItem("selectedEmployerId");
      
      // Clear user context from error logger
      errorLogger.clearUserContext();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Logout failed";
      setError(errorMessage);
      logAuthError('sign-out', err instanceof Error ? err : errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [clearError, clerkSignOut]);

  // Initialize auth state when Clerk loads
  useEffect(() => {
    if (!clerkLoaded) {
      return;
    }

    if (clerkSignedIn && clerkUserId) {
      setIsAuthenticated(true);
      setIsLoading(false);
      // Fetch user data
      updateUserData();
    } else {
      setIsAuthenticated(false);
      setUserData(null);
      lastFetchedClerkId.current = null;
      setIsLoading(false);
    }
  }, [clerkLoaded, clerkSignedIn, clerkUserId, updateUserData]);

  const value: AuthContextType = {
    // State
    isAuthenticated,
    isLoading,
    error,
    clerkUserId: clerkUserId || null,
    userData,
    
    // Actions
    signOut,
    updateUserData,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Re-export types for consumers
export type { UserData, UserRole, AuthContextType };
