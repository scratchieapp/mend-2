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

// DEBUG VERSION - Track all renders and effects
export const useEmployerSelectionDEBUG = () => {
  console.log('🔴 useEmployerSelection RENDER');
  
  const { userData } = useAuth();
  const { userId: clerkUserId } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const queryClient = useQueryClient();
  const renderCount = useRef(0);
  const effectCount = useRef(0);
  
  renderCount.current++;
  console.log(`🔴 Render #${renderCount.current}`);
  
  const [selectedEmployerId, setSelectedEmployerId] = useState<number | null>(() => {
    const stored = localStorage.getItem("selectedEmployerId");
    console.log('🔴 Initial state from localStorage:', stored);
    if (stored === "null" || stored === null) return null;
    return stored ? Number(stored) : null;
  });

  // Log every state change
  useEffect(() => {
    console.log('🔴 selectedEmployerId changed to:', selectedEmployerId);
  }, [selectedEmployerId]);

  // Track userData changes
  useEffect(() => {
    console.log('🔴 userData changed:', userData);
  }, [userData]);

  // Fetch employers
  const { data: employers = [], isLoading: isLoadingEmployers, error: employersError } = useQuery({
    queryKey: ['employers'],
    queryFn: async () => {
      console.log('🔴 Fetching employers...');
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name')
        .order('employer_name');

      if (error) {
        console.error('🔴 Error fetching employers:', error);
        return [];
      }

      console.log('🔴 Employers fetched:', data?.length);
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const handleEmployerChange = async (employerId: number | null) => {
    console.log('🔴 handleEmployerChange called with:', employerId);
    console.log('🔴 Current selectedEmployerId:', selectedEmployerId);
    
    // Prevent duplicate calls
    if (employerId === selectedEmployerId) {
      console.log('🔴 Same employer selected, ignoring');
      return;
    }
    
    try {
      if (!clerkUserId) {
        throw new Error("User not authenticated");
      }
      
      if (employerId === null) {
        if (userData?.role_id !== 1) {
          throw new Error("Only Super Admins can view all companies");
        }
      } else {
        if (userData?.role_id !== 1 && userData?.employer_id !== employerId.toString()) {
          throw new Error("Access denied to this employer");
        }
      }
      
      // Update state
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
      
      console.log('🔴 About to invalidate queries...');
      
      // Invalidate only the essential queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard-incidents'] }),
        queryClient.invalidateQueries({ queryKey: ['incidents-ultra'] })
      ]);
      
      console.log('🔴 Queries invalidated');
      
    } catch (error) {
      console.error('🔴 Failed to change employer:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change employer",
        variant: "destructive"
      });
    }
  };

  console.log('🔴 Returning from hook with:', {
    selectedEmployerId,
    employersCount: employers.length,
    isLoadingEmployers,
    hasError: !!employersError
  });

  return {
    selectedEmployerId,
    employers,
    isLoadingEmployers,
    handleEmployerChange,
    isAuthenticated: !!clerkUserId,
  };
};

export const useEmployerSelection = useEmployerSelectionDEBUG;
