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

// EMERGENCY FIX - Remove all token fetching to stop infinite loop
export const useEmployerSelectionEmergencyFix = () => {
  const { userData } = useAuth();
  const { userId: clerkUserId } = useClerkAuth();
  const queryClient = useQueryClient();
  const isInitialized = useRef(false);
  
  const [selectedEmployerId, setSelectedEmployerId] = useState<number | null>(() => {
    const stored = localStorage.getItem("selectedEmployerId");
    if (stored === "null" || stored === null) return null;
    return stored ? Number(stored) : null;
  });

  // Initialize employer selection on mount
  useEffect(() => {
    if (!userData || isInitialized.current || !clerkUserId) return;
    
    isInitialized.current = true;
    
    const storedId = localStorage.getItem("selectedEmployerId");
    
    if (!storedId || storedId === "null") {
      if (userData.role_id === 1) {
        setSelectedEmployerId(null);
        localStorage.setItem("selectedEmployerId", "null");
      } else if (userData.employer_id) {
        const defaultEmployerId = parseInt(userData.employer_id);
        setSelectedEmployerId(defaultEmployerId);
        localStorage.setItem("selectedEmployerId", defaultEmployerId.toString());
      }
    }
  }, [userData, clerkUserId]);

  // Fetch employers with proper caching
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });

  const handleEmployerChange = async (employerId: number | null) => {
    try {
      if (!clerkUserId) {
        throw new Error("User not authenticated");
      }
      
      // Validate access
      if (employerId === null) {
        if (userData?.role_id !== 1) {
          throw new Error("Only Super Admins can view all companies");
        }
      } else {
        if (userData?.role_id !== 1 && userData?.employer_id !== employerId.toString()) {
          throw new Error("Access denied to this employer");
        }
      }
      
      // Update state first
      setSelectedEmployerId(employerId);
      localStorage.setItem("selectedEmployerId", employerId === null ? "null" : employerId.toString());
      
      // Show toast
      if (employerId === null) {
        toast({
          title: "View All Mode",
          description: "Now viewing data from all companies",
        });
      } else {
        const selectedEmployer = employers.find(e => e.employer_id === employerId);
        if (selectedEmployer) {
          toast({
            title: "Employer selected",
            description: `Switched to ${selectedEmployer.employer_name}`,
          });
        }
      }
      
      // Small delay to ensure state has propagated
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Invalidate ALL queries to ensure complete refresh
      await queryClient.invalidateQueries();
      
      // Force immediate refetch of dashboard data
      await queryClient.refetchQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'dashboard-incidents-v2' || 
                 key === 'dashboard-metrics' ||
                 key === 'admin-users-data' ||
                 key === 'account-manager-data';
        },
        type: 'active'
      });
      
    } catch (error) {
      console.error('Failed to change employer:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change employer",
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

export const useEmployerSelection = useEmployerSelectionEmergencyFix;
