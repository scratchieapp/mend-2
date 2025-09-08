import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useCompanyFilter } from "@/lib/supabase/companyFilter";
import { toast } from "sonner";

export interface DashboardDataParams {
  pageSize?: number;
  pageOffset?: number;
  filterEmployerId?: number | null;
  filterWorkerId?: number | null;
  filterStartDate?: string | null;
  filterEndDate?: string | null;
}

export interface DashboardDataResponse {
  incidents: any[];
  totalCount: number;
  pageSize: number;
  pageOffset: number;
  executionTime: number;
}

/**
 * Ultra-optimized hook for fetching dashboard data
 * Uses the new get_dashboard_data function for <1 second load times
 */
export function useDashboardDataOptimized(params: DashboardDataParams = {}) {
  const { user, userDetails } = useUser();
  const { selectedEmployerId } = useCompanyFilter();

  const {
    pageSize = 25,
    pageOffset = 0,
    filterEmployerId = selectedEmployerId,
    filterWorkerId = null,
    filterStartDate = null,
    filterEndDate = null,
  } = params;

  return useQuery<DashboardDataResponse>({
    queryKey: [
      "dashboard-data-optimized",
      pageSize,
      pageOffset,
      filterEmployerId,
      filterWorkerId,
      filterStartDate,
      filterEndDate,
      userDetails?.role_id,
      userDetails?.employer_id,
    ],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      console.time("Dashboard Data Fetch");
      
      try {
        const { data, error } = await supabase.rpc("get_dashboard_data", {
          page_size: pageSize,
          page_offset: pageOffset,
          filter_employer_id: filterEmployerId,
          filter_worker_id: filterWorkerId,
          filter_start_date: filterStartDate,
          filter_end_date: filterEndDate,
          user_role_id: userDetails?.role_id || null,
          user_employer_id: userDetails?.employer_id || null,
        });

        if (error) {
          console.error("Dashboard data fetch error:", error);
          toast.error("Failed to load dashboard data");
          throw error;
        }

        const result = data as DashboardDataResponse;
        
        console.timeEnd("Dashboard Data Fetch");
        console.log(`Query executed in ${result.executionTime}ms`);
        
        // Show performance improvement toast on first load
        if (result.executionTime < 1000) {
          console.log("✅ Dashboard loaded in under 1 second!");
        }

        return result;
      } catch (error) {
        console.timeEnd("Dashboard Data Fetch");
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Hook for fetching dashboard metrics using the optimized function
 */
export function useDashboardMetrics() {
  const { user, userDetails } = useUser();
  const { selectedEmployerId } = useCompanyFilter();

  return useQuery({
    queryKey: ["dashboard-metrics-optimized", selectedEmployerId, userDetails?.role_id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      // Fetch summary data (first page with count)
      const { data, error } = await supabase.rpc("get_dashboard_data", {
        page_size: 1, // Just need the count
        page_offset: 0,
        filter_employer_id: selectedEmployerId,
        user_role_id: userDetails?.role_id || null,
        user_employer_id: userDetails?.employer_id || null,
      });

      if (error) {
        console.error("Metrics fetch error:", error);
        throw error;
      }

      const result = data as DashboardDataResponse;
      
      return {
        totalIncidents: result.totalCount,
        openIncidents: 0, // These would need separate queries or function modifications
        closedIncidents: 0,
        averageDaysLost: 0,
        executionTime: result.executionTime,
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
}