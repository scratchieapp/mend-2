// src/lib/auth/AuthContext.tsx
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

// We're defining our own type that matches what Supabase returns
// This is a simplified version for our specific query
type UserRole = {
  role_id: number;
  role_name: string;
  role_label: string;
};

type User = {
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

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  userData: User | null;
  session: Session | null;
  error: string | null;
  updateUserData: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedUserId, setLastFetchedUserId] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [isUpdatingUserData, setIsUpdatingUserData] = useState(false);

  // Improved updateUserData with stronger guards against infinite loops
  const updateUserData = useCallback(async () => {
    // Only fetch if we have a session and haven't already fetched for this user
    if (!session?.user) {
      console.log("[AuthContext] No user in session, skipping fetch");
      return;
    }
    
    if (session.user.id === lastFetchedUserId && userData) {
      console.log("[AuthContext] User data already fetched for this user");
      return;
    }
    
    if (isUpdatingUserData) {
      console.log("[AuthContext] Already updating user data, skipping duplicate fetch");
      return;
    }

    setIsUpdatingUserData(true);
    console.log("[AuthContext] Updating user data...");
    
    try {
      console.log("[AuthContext] Fetching user data for", session.user.id);
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
        .eq("user_id", session.user.id)
        .single();

      if (error) {
        console.error("[AuthContext] Error fetching user data:", error);
        if (error.code === '42P17') {
          console.error("[AuthContext] Supabase policy recursion error - check your policies");
        }
        throw error;
      }

      if (!data) {
        throw new Error("No user data returned");
      }

      console.log("[AuthContext] User data fetched:", data);
      
      // Process the data to fix the role structure
      // Supabase returns role as an array, but we expect a single object
      const processedData = {
        ...data,
        // If role array exists and has at least one item, use the first item
        // Otherwise set role to undefined
        role: Array.isArray(data.role) && data.role.length > 0 ? data.role[0] : undefined
      };
      
      setUserData(processedData);
      setIsAuthenticated(true);
      setError(null);
      setLastFetchedUserId(session.user.id);
      setHasFetched(true);
    } catch (err) {
      console.error("[AuthContext] Error fetching user data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch user data");
      
      // Don't reset these on error to prevent logout loops
      // setUserData(null);
      // setIsAuthenticated(false);
    } finally {
      setIsUpdatingUserData(false);
    }
  }, [session, lastFetchedUserId, userData, isUpdatingUserData]);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    setHasFetched(false);

    const maxRetries = 2;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) throw error;

        console.log("[AuthContext] Sign-in successful, user ID:", data.user?.id);
        setSession(data.session);
        setIsAuthenticated(true);
        // Don't update user data here, let the auth state change handler do it
        return; // Exit on success
      } catch (err) {
        console.error("[AuthContext] Sign-in attempt", attempt + 1, "failed:", err);
        attempt++;
        if (attempt === maxRetries) {
          setError(err instanceof Error ? err.message : "Login failed after retries");
          setIsAuthenticated(false);
        }
        // Wait exponentially longer between retries
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt))); 
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setUserData(null);
      setIsAuthenticated(false);
      setLastFetchedUserId(null);
      setHasFetched(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Improved auth state management
  useEffect(() => {
    let mounted = true;
    
    const fetchInitialSession = async () => {
      try {
        console.log("[AuthContext] Initializing auth...");
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        if (!mounted) return;
        
        console.log("[AuthContext] Initial session:", data.session ? data.session.user.id : "none");
        setSession(data.session);
        
        if (data.session) {
          setIsAuthenticated(true);
          if (!lastFetchedUserId || lastFetchedUserId !== data.session.user.id) {
            console.log("[AuthContext] Initial session found, fetching user data...");
            await updateUserData();
          }
        }
      } catch (error) {
        console.error("[AuthContext] Error fetching initial session:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchInitialSession();

    console.log("[AuthContext] Setting up auth state change listener");
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      
      console.log("[AuthContext] Auth state changed:", event, newSession?.user?.id || "none");
      setSession(newSession);
      
      if (event === "SIGNED_IN" && newSession) {
        setIsAuthenticated(true);
        // Only update data on sign in and if needed
        if (!lastFetchedUserId || lastFetchedUserId !== newSession.user.id) {
          updateUserData();
        }
      } else if (event === "SIGNED_OUT") {
        setUserData(null);
        setIsAuthenticated(false);
        setLastFetchedUserId(null);
        setHasFetched(false);
      }
    });

    return () => {
      console.log("[AuthContext] Cleaning up auth state change listener");
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [updateUserData, lastFetchedUserId]);

  // Debug info to help track context values
  useEffect(() => {
    console.log("[AuthContext] AuthContext value:", { 
      isAuthenticated, 
      isLoading, 
      userData: userData ? { ...userData, user_id: userData.user_id } : null,
      session: session ? { user: { id: session.user.id } } : null,
      error 
    });
  }, [isAuthenticated, isLoading, userData, session, error]);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    userData,
    session,
    error,
    updateUserData,
    signIn,
    signOut,
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