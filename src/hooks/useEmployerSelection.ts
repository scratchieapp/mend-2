import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Employer {
  employer_id: number;
  employer_name: string;
}

export const useEmployerSelection = () => {
  const [selectedEmployerId, setSelectedEmployerId] = useState<number | null>(() => {
    const stored = localStorage.getItem("selectedEmployerId");
    return stored ? Number(stored) : null;
  });

  const { data: employers = [], isLoading: isLoadingEmployers } = useQuery({
    queryKey: ['employers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name')
        .order('employer_name');

      if (error) {
        return [];
      }

      return data || [];
    },
  });

  const handleEmployerChange = async (employerId: number) => {
    try {
      const { error } = await supabase.rpc('set_employer_context', {
        employer_id: employerId
      });
      
      if (error) throw error;

      setSelectedEmployerId(employerId);
      localStorage.setItem("selectedEmployerId", employerId.toString());
      
      const selectedEmployer = employers.find(e => e.employer_id === employerId);
      if (selectedEmployer) {
        toast({
          title: "Employer selected",
          description: `Switched to ${selectedEmployer.employer_name}`,
        });
      }

      // Force reload the page to reset all React states
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change employer. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    selectedEmployerId,
    employers,
    isLoadingEmployers,
    handleEmployerChange
  };
};