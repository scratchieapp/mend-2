import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format } from "date-fns";
import { MIN_MONTHLY_HOURS } from "@/utils/safetyCalculations";

export interface MonthlyData {
  month: string;
  lti_rate: number;
  original_date: string;
  total_hours: number;
  has_insufficient_hours: boolean;
}

export const useTimeSeriesData = (selectedEmployerId: number | null) => {
  return useQuery({
    queryKey: ['time-series', selectedEmployerId],
    queryFn: async () => {
      if (!selectedEmployerId) return [];

      try {
        // Calculate date range for last 6 months
        const endDate = startOfMonth(new Date());
        const startDate = subMonths(endDate, 5);

        // Fetching time series data for date range

        // First set employer context
        const { error: contextError } = await supabase.rpc('set_employer_context', {
          employer_id: selectedEmployerId
        });

        if (contextError) {
          console.error('Error setting employer context:', contextError);
          throw contextError;
        }

        const { data, error } = await supabase
          .from('lti_rates')
          .select('month, lti_rate, total_hours')
          .eq('employer_id', selectedEmployerId)
          .gte('month', startDate.toISOString())
          .lte('month', endDate.toISOString())
          .order('month');

        if (error) {
          console.error('Error fetching time series data:', error);
          throw error;
        }

        // Raw LTI rates data received

        // Format the data for the chart, ensuring we only take the latest entry for each month
        const monthlyData = (data || []).reduce((acc: Record<string, MonthlyData>, record) => {
          const monthKey = format(new Date(record.month), 'yyyy-MM');
          const formattedMonth = format(new Date(record.month), 'MMM yyyy');
          
          // Flag months with insufficient hours but include them in the data
          const hasInsufficientHours = record.total_hours < MIN_MONTHLY_HOURS;
          if (hasInsufficientHours) {
            // Warning: Month has insufficient hours
          }
          
          // Only update if we don't have this month yet or if this record is more recent
          if (!acc[monthKey] || new Date(record.month) > new Date(acc[monthKey].original_date)) {
            acc[monthKey] = {
              month: formattedMonth,
              lti_rate: Number(record.lti_rate.toFixed(2)),
              original_date: record.month,
              total_hours: record.total_hours,
              has_insufficient_hours: hasInsufficientHours
            };
          }
          return acc;
        }, {});

        // Convert to array and sort by date
        const sortedData = Object.values(monthlyData).sort((a, b) => 
          new Date(a.original_date).getTime() - new Date(b.original_date).getTime()
        );

        // Processed time series data

        return sortedData;
      } catch (error) {
        console.error('Error in time series data fetch:', error);
        return [];
      }
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    enabled: !!selectedEmployerId,
  });
};