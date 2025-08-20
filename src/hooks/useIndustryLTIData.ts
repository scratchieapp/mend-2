import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, format, subMonths } from "date-fns";

export interface IndustryLTIData {
  average: string;
  employers: number;
  isCurrentMonth: boolean;
  month: string;
}

export const useIndustryLTIData = () => {
  return useQuery({
    queryKey: ['industry-lti-data'],
    queryFn: async (): Promise<IndustryLTIData> => {
      // Get the most recent data from the last 6 months
      const endDate = startOfMonth(new Date());
      const startDate = subMonths(endDate, 6);
      
      // Fetching industry LTI data for date range
      
      const { data, error } = await supabase
        .from('lti_rates_mend')
        .select('mend_average, total_employers, month')
        .gte('month', startDate.toISOString())
        .lte('month', endDate.toISOString())
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // Error fetching industry data
        throw error;
      }

      // Raw data from database received
      
      if (!data) {
        // No data found in the last 6 months
        return {
          average: '0.0',
          employers: 0,
          isCurrentMonth: false,
          month: format(endDate, 'MMMM yyyy')
        };
      }

      return {
        average: data.mend_average?.toFixed(1) || '0.0',
        employers: data.total_employers || 0,
        isCurrentMonth: format(new Date(data.month), 'yyyy-MM') === format(endDate, 'yyyy-MM'),
        month: format(new Date(data.month), 'MMMM yyyy')
      };
    }
  });
};