import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/clerk-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth/AuthContext";

interface Employer {
  employer_id: number;
  employer_name: string;
}

export const useEmployerSelectionFixed = () => {
  const { userData } = useAuth();
  const { userId: clerkUserId } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress || null;
  const queryClient = useQueryClient();
  const isInitialized = useRef(false);
  
  const [selectedEmployerId, setSelectedEmployerId] = useState<number | null>(() => {
    const stored = localStorage.getItem("selectedEmployerId");
    // If stored value is "null" string, return null for View All mode
    if (stored === "null" || stored === null) return null;
    return stored ? Number(stored) : null;
  });

  // Initialize employer context ONLY ONCE on mount
  useEffect(() => {
    const initializeContext = async () => {
      // Only initialize if we have user data and haven't initialized yet
      if (!userData || isInitialized.current || (!clerkUserId && !clerkEmail)) return;
      
      isInitialized.current = true;
      
      try {
        // Check if we already have a stored selection
        const storedId = localStorage.getItem("selectedEmployerId");
        
        if (storedId === "null" && userData.role_id === 1) {
          // Super admin with "View All" mode
          await supabase.rpc('clear_employer_context');
        } else if (storedId && storedId !== "null") {
          // Has a stored selection
          const employerId = parseInt(storedId);
          await supabase.rpc('set_employer_context', {
            p_employer_id: employerId
          });
        } else if (userData.employer_id && userData.role_id !== 1) {
          // Non-super admin with default employer
          const defaultEmployerId = parseInt(userData.employer_id);
          await supabase.rpc('set_employer_context', {
            p_employer_id: defaultEmployerId
          });
          setSelectedEmployerId(defaultEmployerId);
          localStorage.setItem("selectedEmployerId", defaultEmployerId.toString());
        } else if (userData.role_id === 1) {
          // Super admin without selection - default to View All
          await supabase.rpc('clear_employer_context');
          setSelectedEmployerId(null);
          localStorage.setItem("selectedEmployerId", "null");
        }
      } catch (err) {
        console.error('Failed to initialize employer context:', err);
      }
    };

    initializeContext();
  }, [userData, clerkUserId, clerkEmail]); // REMOVED selectedEmployerId from dependencies!

  const { data: employers = [], isLoading: isLoadingEmployers } = useQuery({
    queryKey: ['employers'],
    queryFn: async () => {
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
  });

  const handleEmployerChange = async (employerId: number | null) => {
    // Debug logs removed for production
    
    try {
      // Ensure we have Clerk auth
      if (!clerkUserId && !clerkEmail) {
        throw new Error("User not authenticated with Clerk");
      }
      
      // Handle "View All" mode for Super Admins
      if (employerId === null) {
        // Only Super Admins can use View All mode
        if (userData?.role_id !== 1) {
          throw new Error("Only Super Admins can view all companies");
        }
        
        // Clear employer context for View All mode
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
        // Set specific employer context
        // console.log('Calling set_employer_context with p_employer_id:', employerId);
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

      // FIXED: Only invalidate specific queries that depend on employer context
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard-incidents'] }),
        queryClient.invalidateQueries({ queryKey: ['incidents-ultra'] }),
        queryClient.invalidateQueries({ queryKey: ['employer-statistics'] }),
        queryClient.invalidateQueries({ queryKey: ['employer-statistics-clerk'] }),
        queryClient.invalidateQueries({ queryKey: ['workers'] }),
        queryClient.invalidateQueries({ queryKey: ['sites'] }),
        queryClient.invalidateQueries({ queryKey: ['site-safety'] }),
        queryClient.invalidateQueries({ queryKey: ['builderStats'] }),
        queryClient.invalidateQueries({ queryKey: ['incidents'] }),
        queryClient.invalidateQueries({ queryKey: ['incidents-clerk'] })
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
    isAuthenticated: !!clerkUserId || !!clerkEmail,
  };
};

// Export with all names for compatibility
export const useEmployerSelectionWithClerk = useEmployerSelectionFixed;
export const useEmployerSelectionOptimized = useEmployerSelectionFixed;
export const useEmployerSelection = useEmployerSelectionFixed;
