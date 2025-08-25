import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths } from "date-fns";
import { transformIncidentData } from "@/utils/chartDataTransformers";

export const useIncidentData = (selectedEmployerId?: number | null) => {
  return useQuery({
    queryKey: ['incident-distribution', selectedEmployerId],
    queryFn: async () => {
      // Use current date as end date, and go back 12 months to capture more data
      const endDate = new Date();
      const startDate = subMonths(endDate, 11); // Last 12 months inclusive

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

      console.log('Raw incidents from DB:', incidents);
      console.log('Raw employers from DB:', employers);
      console.log('Date range:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });

      return transformIncidentData(incidents, employers);
    }
  });
};