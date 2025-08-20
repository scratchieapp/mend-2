import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Site } from "@/integrations/supabase/types/site";

export const useSites = (selectedEmployerId: number | null) => {
  return useQuery({
    queryKey: ['sites', selectedEmployerId],
    queryFn: async () => {
      if (!selectedEmployerId) {
        console.log('No employer selected');
        return [];
      }

      console.log('Fetching sites for employer:', selectedEmployerId);

      const { error: contextError } = await supabase.rpc('set_employer_context', {
        employer_id: selectedEmployerId
      });

      if (contextError) {
        console.error('Error setting employer context:', contextError);
        throw contextError;
      }

      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('employer_id', selectedEmployerId)
        .order('site_name');
      
      if (error) {
        console.error('Error fetching sites:', error);
        throw error;
      }

      console.log('Fetched sites:', data);
      return data as Site[];
    },
    enabled: !!selectedEmployerId,
  });
};