import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth/AuthContext";

interface Employer {
  employer_id: number;
  employer_name: string;
}

export const useEmployerSelection = () => {
  const { userData } = useAuth();
  const [selectedEmployerId, setSelectedEmployerId] = useState<number | null>(() => {
    const stored = localStorage.getItem("selectedEmployerId");
    return stored ? Number(stored) : null;
  });

  // Initialize employer context on mount or when user data changes
  useEffect(() => {
    const initializeContext = async () => {
      // Only initialize if we have user data and a selected employer
      if (!userData || !selectedEmployerId) return;
      
      try {
        // Check if context needs to be set (e.g., after login or page refresh)
        const { error } = await supabase.rpc('set_employer_context', {
          employer_id: selectedEmployerId
        });
        
        if (error) {
          console.error('Error initializing employer context:', error);
          // If error, try to set to user's default employer
          if (userData.employer_id) {
            const defaultEmployerId = parseInt(userData.employer_id);
            await supabase.rpc('set_employer_context', {
              employer_id: defaultEmployerId
            });
            setSelectedEmployerId(defaultEmployerId);
            localStorage.setItem("selectedEmployerId", defaultEmployerId.toString());
          }
        }
      } catch (err) {
        console.error('Failed to initialize employer context:', err);
      }
    };

    initializeContext();
  }, [userData, selectedEmployerId]);

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
      // Set the employer context in the database
      const { error } = await supabase.rpc('set_employer_context', {
        employer_id: employerId
      });
      
      if (error) {
        console.error('Error setting employer context:', error);
        throw error;
      }

      setSelectedEmployerId(employerId);
      localStorage.setItem("selectedEmployerId", employerId.toString());
      
      const selectedEmployer = employers.find(e => e.employer_id === employerId);
      if (selectedEmployer) {
        toast({
          title: "Employer selected",
          description: `Switched to ${selectedEmployer.employer_name}`,
        });
      }

      // Force reload the page to reset all React states and apply new RLS context
      window.location.reload();
    } catch (error) {
      console.error('Failed to change employer:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change employer. Please try again.",
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