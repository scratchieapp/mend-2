// src/lib/auth/AuthContext.tsx
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
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
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
  site_id?: string | null;
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
  user: SupabaseUser | null;  // Supabase auth user
  userData: UserData | null;   // Our database user data
  session: Session | null;     // Current session
  
  // Session info
  sessionExpiresAt: Date | null;
  isSessionExpiring: boolean;
  
  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserData: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
};

// Session timeout constants
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const SESSION_WARNING_MS = 5 * 60 * 1000; // 5 minutes before expiry
const SESSION_CHECK_INTERVAL = 60 * 1000; // Check every minute

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Check for Clerk authentication
  const { isLoaded: clerkLoaded, isSignedIn: clerkSignedIn, userId: clerkUserId } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  
  // Core auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // User and session data
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  
  // Session management
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null);
  const [isSessionExpiring, setIsSessionExpiring] = useState(false);
  
  // Refs to prevent memory leaks
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout>();
  const lastFetchedUserId = useRef<string | null>(null);
  const isUpdatingUserData = useRef(false);
  const lastClerkEmail = useRef<string | null>(null);
  const lastClerkUserId = useRef<string | null>(null);

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Calculate session expiry
  const updateSessionExpiry = useCallback((session: Session | null) => {
    if (session?.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000);
      setSessionExpiresAt(expiresAt);
      
      // Check if session is expiring soon
      const timeUntilExpiry = expiresAt.getTime() - Date.now();
      setIsSessionExpiring(timeUntilExpiry < SESSION_WARNING_MS);
    } else {
      setSessionExpiresAt(null);
      setIsSessionExpiring(false);
    }
  }, []);

  // Fetch user data from database
  const updateUserData = useCallback(async () => {
    // Prevent updating if already in progress
    if (isUpdatingUserData.current) {
      return;
    }

    // Check for Clerk user first
    if (clerkSignedIn && clerkUser) {
      const currentEmail = clerkUser.primaryEmailAddress?.emailAddress;
      const currentUserId = clerkUserId;
      
      // Check if values have changed to prevent unnecessary API calls
      if (currentEmail === lastClerkEmail.current && 
          currentUserId === lastClerkUserId.current && 
          userData) {
        return;
      }
      
      isUpdatingUserData.current = true;
      // Fetch by email for Clerk users
      try {
        const { data, error } = await supabase
          .from("users")
          .select(`
            user_id,
            email,
            display_name,
            custom_display_name,
            role_id,
            employer_id,
            site_id,
            created_at,
            updated_at,
            last_seen_at,
            role:user_roles (
              role_id,
              role_name,
              role_label
            )
          `)
          .eq("email", clerkUser.primaryEmailAddress?.emailAddress)
          .single();

        if (!error && data) {
          const processedData: UserData = {
            ...data,
            role: Array.isArray(data.role) && data.role.length > 0 
              ? data.role[0] 
              : data.role || undefined
          };
          
          setUserData(processedData);
          lastFetchedUserId.current = clerkUserId || null;
          lastClerkEmail.current = currentEmail || null;
          lastClerkUserId.current = currentUserId || null;
          clearError();
          return;
        }
      } catch (err) {
        console.error('Error fetching Clerk user data:', err);
      } finally {
        isUpdatingUserData.current = false;
      }
    }
    
    // Fall back to Supabase user
    if (!user) {
      setUserData(null);
      return;
    }
    
    // Prevent duplicate fetches
    if (user.id === lastFetchedUserId.current && userData) {
      return;
    }

    isUpdatingUserData.current = true;
    
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          user_id,
          email,
          display_name,
          custom_display_name,
          role_id,
          employer_id,
          site_id,
          created_at,
          updated_at,
          last_seen_at,
          role:user_roles (
            role_id,
            role_name,
            role_label
          )
        `)
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // User doesn't exist in our database yet
          // This can happen for new signups
          const errorMsg = "User profile not found. Please contact support.";
          setError(errorMsg);
          logAuthError('fetch-user-data', errorMsg, { errorCode: error.code });
        } else {
          const errorMsg = "Failed to load user profile";
          setError(errorMsg);
          logAuthError('fetch-user-data', error, { errorCode: error.code });
        }
        throw error;
      }

      if (!data) {
        throw new Error("No user data returned");
      }
      
      // Process the data to ensure role is an object
      const processedData: UserData = {
        ...data,
        role: Array.isArray(data.role) && data.role.length > 0 
          ? data.role[0] 
          : data.role || undefined
      };
      
      setUserData(processedData);
      lastFetchedUserId.current = user.id;
      clearError();
      
      // Set user context for error logging
      errorLogger.setUserContext(
        processedData.user_id, 
        processedData.role?.role_name
      );
    } catch (err) {
      logAuthError('update-user-data', err instanceof Error ? err : String(err));
    } finally {
      isUpdatingUserData.current = false;
    }
  }, [user, userData, clearError, clerkSignedIn, clerkUser?.primaryEmailAddress?.emailAddress, clerkUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) throw error;
      
      if (session) {
        setSession(session);
        setUser(session.user);
        updateSessionExpiry(session);
        setIsAuthenticated(true);
      }
    } catch (err) {
      logAuthError('refresh-session', err instanceof Error ? err : String(err));
      // Session refresh failed, clear session data
      setSession(null);
      setUser(null);
      setIsAuthenticated(false);
      clearSessionExpiry();
    }
  }, [updateSessionExpiry]);

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    clearError();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) throw error;

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        updateSessionExpiry(data.session);
        setIsAuthenticated(true);
        // User data will be fetched by the auth state change listener
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      setIsAuthenticated(false);
      logAuthError('sign-in', err instanceof Error ? err : errorMessage, { email });
      throw err; // Re-throw for form handling
    } finally {
      setIsLoading(false);
    }
  }, [clearError, updateSessionExpiry]);

  // Sign out
  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all state
      setSession(null);
      setUser(null);
      setUserData(null);
      setIsAuthenticated(false);
      setSessionExpiresAt(null);
      setIsSessionExpiring(false);
      lastFetchedUserId.current = null;
      clearError();
      
      // Clear user context from error logger
      errorLogger.clearUserContext();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Logout failed";
      setError(errorMessage);
      logAuthError('sign-out', err instanceof Error ? err : errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  // Monitor session expiry
  useEffect(() => {
    if (!sessionExpiresAt) return;

    const checkSession = () => {
      const now = Date.now();
      const expiryTime = sessionExpiresAt.getTime();
      const timeUntilExpiry = expiryTime - now;

      if (timeUntilExpiry <= 0) {
        // Session expired
        signOut();
      } else if (timeUntilExpiry < SESSION_WARNING_MS && !isSessionExpiring) {
        // Session expiring soon
        setIsSessionExpiring(true);
        // Attempt to refresh
        refreshSession();
      }
    };

    // Check immediately
    checkSession();

    // Set up interval
    sessionCheckIntervalRef.current = setInterval(checkSession, SESSION_CHECK_INTERVAL);

    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
    };
  }, [sessionExpiresAt, isSessionExpiring, signOut, refreshSession]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check for Clerk authentication first
        if (clerkLoaded && clerkSignedIn && clerkUser) {
          if (mounted) {
            // Create a mock user object for compatibility
            setUser({ id: clerkUserId, email: clerkUser.primaryEmailAddress?.emailAddress } as SupabaseUser);
            setIsAuthenticated(true);
            setIsLoading(false);
            // Fetch user data for Clerk user
            await updateUserData();
            return;
          }
        }
        
        // Fall back to Supabase auth
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted && session) {
          setSession(session);
          setUser(session.user);
          updateSessionExpiry(session);
          setIsAuthenticated(true);
        }
      } catch (err) {
        if (mounted) {
          setError("Failed to initialize authentication");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user || null);
          updateSessionExpiry(session);
          setIsAuthenticated(!!session);
          
          // Fetch user data after sign in
          if (session?.user) {
            // Delay to ensure database has processed the user
            updateTimeoutRef.current = setTimeout(() => {
              if (mounted) {
                updateUserData();
              }
            }, 500);
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setUserData(null);
          setIsAuthenticated(false);
          setSessionExpiresAt(null);
          setIsSessionExpiring(false);
          lastFetchedUserId.current = null;
        } else if (event === 'USER_UPDATED') {
          setUser(session?.user || null);
          if (session?.user) {
            updateUserData();
          }
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      
      // Clear timeouts
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
    };
  }, [updateSessionExpiry, updateUserData, clerkLoaded, clerkSignedIn, clerkUser?.id, clerkUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch user data when user changes
  useEffect(() => {
    if (user && isAuthenticated) {
      updateUserData();
    }
  }, [user, isAuthenticated, updateUserData]);

  const value: AuthContextType = {
    // State
    isAuthenticated,
    isLoading,
    error,
    user,
    userData,
    session,
    sessionExpiresAt,
    isSessionExpiring,
    
    // Actions
    signIn,
    signOut,
    updateUserData,
    refreshSession,
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