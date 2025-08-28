import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/clerk-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth/AuthContext";

interface Employer {
  employer_id: number;
  employer_name: string;
}

export const useEmployerSelectionOptimized = () => {
  const { userData } = useAuth();
  const { userId: clerkUserId } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress || null;
  const queryClient = useQueryClient();
  
  const [selectedEmployerId, setSelectedEmployerId] = useState<number | null>(() => {
    const stored = localStorage.getItem("selectedEmployerId");
    // If stored value is "null" string, return null for View All mode
    if (stored === "null" || stored === null) return null;
    return stored ? Number(stored) : null;
  });

  // Initialize employer context on mount or when user data changes
  useEffect(() => {
    const initializeContext = async () => {
      // Only initialize if we have both user data and Clerk auth
      if (!userData || (!clerkUserId && !clerkEmail)) return;
      
      try {
        // If Super Admin has selected "View All" mode (null), set context to null
        if (selectedEmployerId === null && userData.role_id === 1) {
          const { error } = await supabase.rpc('clear_employer_context');
          if (error) {
            console.error('Error setting View All context:', error);
          }
        } else if (selectedEmployerId) {
          // Set specific employer context
          const { error } = await supabase.rpc('set_employer_context', {
            p_employer_id: selectedEmployerId
          });
          
          if (error) {
            console.error('Error initializing employer context:', error);
            // If error, try to set to user's default employer
            if (userData.employer_id) {
              const defaultEmployerId = parseInt(userData.employer_id);
              await supabase.rpc('set_employer_context', {
                p_employer_id: defaultEmployerId
              });
              setSelectedEmployerId(defaultEmployerId);
              localStorage.setItem("selectedEmployerId", defaultEmployerId.toString());
            }
          }
        } else if (!selectedEmployerId && userData.employer_id) {
          // No selection yet, set to user's default employer
          const defaultEmployerId = parseInt(userData.employer_id);
          await supabase.rpc('set_employer_context_with_clerk', {
            employer_id: defaultEmployerId,
            clerk_user_id: clerkUserId || null,
            clerk_email: clerkEmail
          });
          setSelectedEmployerId(defaultEmployerId);
          localStorage.setItem("selectedEmployerId", defaultEmployerId.toString());
        }
      } catch (err) {
        console.error('Failed to initialize employer context:', err);
      }
    };

    initializeContext();
  }, [userData, selectedEmployerId, clerkUserId, clerkEmail]);

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
        
        // Set employer context to null for View All mode
        const { error } = await supabase.rpc('clear_employer_context');
        
        if (error) {
          console.error('Error setting View All context:', error);
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
      // This is the key fix - no more window.location.reload()!
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

// Export with both names for compatibility
export const useEmployerSelectionWithClerk = useEmployerSelectionOptimized;
export const useEmployerSelection = useEmployerSelectionOptimized;
