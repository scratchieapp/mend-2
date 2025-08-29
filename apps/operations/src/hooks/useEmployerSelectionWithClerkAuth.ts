import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/clerk-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth/AuthContext";
import { createClient } from '@supabase/supabase-js';

interface Employer {
  employer_id: number;
  employer_name: string;
}

// Create a Supabase client that uses Clerk's JWT token
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const useEmployerSelectionWithClerkAuth = () => {
  const { userData } = useAuth();
  const { userId: clerkUserId, getToken } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress || null;
  const queryClient = useQueryClient();
  const isInitialized = useRef(false);
  
  const [selectedEmployerId, setSelectedEmployerId] = useState<number | null>(() => {
    const stored = localStorage.getItem("selectedEmployerId");
    if (stored === "null" || stored === null) return null;
    return stored ? Number(stored) : null;
  });

  // Create Supabase client with Clerk token
  const getSupabaseClient = async () => {
    const token = await getToken({ template: 'supabase' });
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
    
    return supabase;
  };

  // Initialize employer context ONLY ONCE on mount
  useEffect(() => {
    const initializeContext = async () => {
      if (!userData || isInitialized.current || !clerkUserId) return;
      
      isInitialized.current = true;
      
      try {
        const supabase = await getSupabaseClient();
        const storedId = localStorage.getItem("selectedEmployerId");
        
        if (storedId === "null" && userData.role_id === 1) {
          await supabase.rpc('clear_employer_context');
        } else if (storedId && storedId !== "null") {
          const employerId = parseInt(storedId);
          await supabase.rpc('set_employer_context', {
            p_employer_id: employerId
          });
        } else if (userData.employer_id && userData.role_id !== 1) {
          const defaultEmployerId = parseInt(userData.employer_id);
          await supabase.rpc('set_employer_context', {
            p_employer_id: defaultEmployerId
          });
          setSelectedEmployerId(defaultEmployerId);
          localStorage.setItem("selectedEmployerId", defaultEmployerId.toString());
        } else if (userData.role_id === 1) {
          await supabase.rpc('clear_employer_context');
          setSelectedEmployerId(null);
          localStorage.setItem("selectedEmployerId", "null");
        }
      } catch (err) {
        console.error('Failed to initialize employer context:', err);
      }
    };

    initializeContext();
  }, [userData, clerkUserId, getToken]);

  const { data: employers = [], isLoading: isLoadingEmployers } = useQuery({
    queryKey: ['employers'],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name')
        .order('employer_name');

      if (error) {
        console.error('Error fetching employers:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!clerkUserId,
  });

  const handleEmployerChange = async (employerId: number | null) => {
    try {
      if (!clerkUserId) {
        throw new Error("User not authenticated with Clerk");
      }
      
      const supabase = await getSupabaseClient();
      
      if (employerId === null) {
        if (userData?.role_id !== 1) {
          throw new Error("Only Super Admins can view all companies");
        }
        
        const { error } = await supabase.rpc('clear_employer_context');
        
        if (error) {
          console.error('Error clearing employer context:', error);
          throw error;
        }
        
        setSelectedEmployerId(null);
        localStorage.setItem("selectedEmployerId", "null");
        
        toast({
          title: "View All Mode",
          description: "Now viewing data from all companies",
        });
      } else {
        console.log('Setting employer context with ID:', employerId);
        const { error } = await supabase.rpc('set_employer_context', {
          p_employer_id: employerId
        });
        
        if (error) {
          console.error('Error setting employer context:', error);
          throw error;
        }

        setSelectedEmployerId(employerId);
        localStorage.setItem("selectedEmployerId", employerId.toString());
        
        const selectedEmployer = employers.find(e => e.employer_id === employerId);
        if (selectedEmployer) {
          toast({
            title: "Employer selected",
            description: `Switched to ${selectedEmployer.employer_name}`,
          });
        }
      }

      // Invalidate queries that depend on employer context
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard-incidents'] }),
        queryClient.invalidateQueries({ queryKey: ['incidents-ultra'] }),
        queryClient.invalidateQueries({ queryKey: ['employer-statistics'] }),
        queryClient.invalidateQueries({ queryKey: ['workers'] }),
        queryClient.invalidateQueries({ queryKey: ['sites'] }),
        queryClient.invalidateQueries({ queryKey: ['incidents'] })
      ]);
      
    } catch (error) {
      console.error('Failed to change employer:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change employer. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    selectedEmployerId,
    employers,
    isLoadingEmployers,
    handleEmployerChange,
    isAuthenticated: !!clerkUserId,
  };
};

// Export with all names for compatibility
export const useEmployerSelection = useEmployerSelectionWithClerkAuth;
