import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EmployerStatistics {
  incident_count: number;
  worker_count: number;
  site_count: number;
  active_lti_count: number;
  selected_employer_id: number;
  selected_employer_name: string;
  avg_days_lost?: number;
  total_days_lost?: number;
  incidents_this_month?: number;
  incidents_last_month?: number;
  open_incidents?: number;
  closed_incidents?: number;
}

export const useEmployerContext = () => {
  const { userData } = useAuth();
  const queryClient = useQueryClient();

  // 1. SOURCE OF TRUTH: Fetch state from Cache, defaulting to LocalStorage or DB
  const { data: selectedEmployerId } = useQuery({
    queryKey: ['employer-context-id'],
    queryFn: () => {
      // Security: Non-super-admins MUST use their assigned ID
      if (userData?.role_id !== 1) {
        return userData?.employer_id ? Number(userData.employer_id) : null;
      }
      
      // Super Admins: Check local storage first
      const stored = localStorage.getItem("selectedEmployerId");
      if (stored === "null") return null;
      if (stored) return Number(stored);
      
      return null; // Default to "All Companies"
    },
    initialData: null,
    staleTime: Infinity, // Do not refetch this automatically
  });

  // 2. SETTER: Updates both LocalStorage and Cache to stop the "fight"
  const setContext = useMutation({
    mutationFn: async (employerId: number | null) => {
      return employerId;
    },
    onSuccess: (employerId) => {
      const idString = employerId === null ? "null" : String(employerId);
      localStorage.setItem("selectedEmployerId", idString);
      
      // Update the state immediately
      queryClient.setQueryData(['employer-context-id'], employerId);
      
      // CRITICAL: Remove ALL queries related to the old employer context to force fresh fetch
      queryClient.removeQueries({ 
        queryKey: ['dashboard-incidents-v2'],
        exact: false 
      });
      queryClient.removeQueries({ 
        queryKey: ['employer-statistics'],
        exact: false 
      });
      queryClient.removeQueries({ 
        queryKey: ['incidents'],
        exact: false 
      });
      
      // Then invalidate to trigger refetch with new context
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard-incidents-v2'],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['employer-statistics'],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['incidents'],
        refetchType: 'active'
      });
      
      toast({ 
        title: "Context Changed", 
        description: employerId ? "Filtering by specific employer" : "Viewing all companies" 
      });
    }
  });

  // 3. DATA: Fetch list of employers (for Super Admins)
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
    gcTime: 10 * 60 * 1000,
    enabled: userData?.role_id === 1, // Only fetch for super admins
  });

  // 4. STATS: Get statistics for the current employer context
  const { data: statistics, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['employer-statistics', selectedEmployerId, userData?.role_id],
    queryFn: async () => {
      // If no context selected and not super admin, return null
      if (selectedEmployerId === null && userData?.role_id !== 1) return null;
      
      const { data, error } = await supabase.rpc('get_employer_statistics_direct', {
        p_employer_id: selectedEmployerId,
        p_user_role: userData?.role_id
      });
      
      if (error) {
        console.error('Error fetching employer statistics:', error);
        return null;
      }
      
      return data?.[0] as EmployerStatistics | null;
    },
    enabled: !!userData,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    selectedEmployerId,
    setContext: setContext.mutate,
    isLoading: setContext.isPending,
    employers,
    isLoadingEmployers,
    statistics,
    isLoadingStats,
    refetchStats,
    isSuperAdmin: userData?.role_id === 1
  };
};
