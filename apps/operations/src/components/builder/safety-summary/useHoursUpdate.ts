import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UpdateHoursParams {
  siteId: number;
  employerId: number;
  month: string;
  employerHours: number;
  subcontractorHours: number;
  currentStatus: string;
}

export const useHoursUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      siteId, 
      employerId, 
      month, 
      employerHours, 
      subcontractorHours,
      currentStatus 
    }: UpdateHoursParams) => {
      if (currentStatus !== 'working') {
        throw new Error('Cannot update hours for a paused or finished site');
      }

      if (!employerId) {
        throw new Error('Employer ID is required');
      }

      // Updating hours for site

      const { error } = await supabase
        .from('hours_worked')
        .upsert({
          site_id: siteId,
          employer_id: employerId,
          month,
          employer_hours: employerHours,
          subcontractor_hours: subcontractorHours
        }, {
          onConflict: 'site_id,employer_id,month'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-safety'] });
      toast.success('Hours updated successfully');
    },
    onError: (error) => {
      console.error('Error updating hours:', error);
      toast.error(error.message || 'Failed to update hours');
    }
  });
};