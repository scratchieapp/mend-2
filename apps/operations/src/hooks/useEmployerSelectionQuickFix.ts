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

export const useEmployerSelectionQuickFix = () => {
  const { userData } = useAuth();
  const { userId: clerkUserId } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const queryClient = useQueryClient();
  const isInitialized = useRef(false);
  
  const [selectedEmployerId, setSelectedEmployerId] = useState<number | null>(() => {
    const stored = localStorage.getItem("selectedEmployerId");
    if (stored === "null" || stored === null) return null;
    return stored ? Number(stored) : null;
  });

  // Initialize employer selection on mount
  useEffect(() => {
    const initializeSelection = async () => {
      if (!userData || isInitialized.current || !clerkUserId) return;
      
      isInitialized.current = true;
      
      const storedId = localStorage.getItem("selectedEmployerId");
      
      if (!storedId || storedId === "null") {
        if (userData.role_id === 1) {
          // Super admin - default to View All
          setSelectedEmployerId(null);
          localStorage.setItem("selectedEmployerId", "null");
        } else if (userData.employer_id) {
          // Regular user - set to their employer
          const defaultEmployerId = parseInt(userData.employer_id);
          setSelectedEmployerId(defaultEmployerId);
          localStorage.setItem("selectedEmployerId", defaultEmployerId.toString());
        }
      }
    };

    initializeSelection();
  }, [userData, clerkUserId]);

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
      if (!clerkUserId) {
        throw new Error("User not authenticated");
      }
      
      // For "View All" mode
      if (employerId === null) {
        if (userData?.role_id !== 1) {
          throw new Error("Only Super Admins can view all companies");
        }
        
        setSelectedEmployerId(null);
        localStorage.setItem("selectedEmployerId", "null");
        
        toast({
          title: "View All Mode",
          description: "Now viewing data from all companies",
        });
      } else {
        // For specific employer selection
        // Verify user has access to this employer
        if (userData?.role_id !== 1 && userData?.employer_id !== employerId.toString()) {
          throw new Error("Access denied to this employer");
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

      // Important: We're NOT calling set_employer_context since it requires Supabase auth
      // Instead, the queries will use selectedEmployerId directly
      
      // Invalidate queries to refetch with new employer filter
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
      
      // Reset to previous value on error
      const stored = localStorage.getItem("selectedEmployerId");
      if (stored === "null") {
        setSelectedEmployerId(null);
      } else if (stored) {
        setSelectedEmployerId(parseInt(stored));
      }
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
export const useEmployerSelectionWithClerk = useEmployerSelectionQuickFix;
export const useEmployerSelectionOptimized = useEmployerSelectionQuickFix;
export const useEmployerSelectionFixed = useEmployerSelectionQuickFix;
export const useEmployerSelection = useEmployerSelectionQuickFix;
