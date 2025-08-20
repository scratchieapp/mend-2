import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths } from "date-fns";
import { transformIncidentData } from "@/utils/chartDataTransformers";

export const useIncidentData = () => {
  return useQuery({
    queryKey: ['incident-distribution'],
    queryFn: async () => {
      const endDate = startOfMonth(new Date());
      const startDate = subMonths(endDate, 5); // Last 6 months inclusive

      // Get all employers
      const { data: employers } = await supabase
        .from('employers')
        .select('employer_id, employer_name')
        .order('employer_name');

      // Get incidents for the period
      const { data: incidents, error } = await supabase
        .from('incidents')
        .select(`
          date_of_injury,
          employers (
            employer_name
          )
        `)
        .gte('date_of_injury', startDate.toISOString())
        .lte('date_of_injury', endDate.toISOString());

      if (error) {
        console.error('Error fetching incident data:', error);
        throw error;
      }

      return transformIncidentData(incidents, employers);
    }
  });
};