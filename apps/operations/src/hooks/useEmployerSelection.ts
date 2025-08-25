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
    // If stored value is "null" string, return null for View All mode
    if (stored === "null" || stored === null) return null;
    return stored ? Number(stored) : null;
  });

  // Initialize employer context on mount or when user data changes
  useEffect(() => {
    const initializeContext = async () => {
      // Only initialize if we have user data
      if (!userData) return;
      
      try {
        // If Super Admin has selected "View All" mode (null), clear context
        if (selectedEmployerId === null && userData.role_id === 1) {
          const { error } = await supabase.rpc('clear_employer_context');
          if (error) {
            console.error('Error clearing employer context:', error);
          }
        } else if (selectedEmployerId) {
          // Set specific employer context
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
        } else if (!selectedEmployerId && userData.employer_id) {
          // No selection yet, set to user's default employer
          const defaultEmployerId = parseInt(userData.employer_id);
          await supabase.rpc('set_employer_context', {
            employer_id: defaultEmployerId
          });
          setSelectedEmployerId(defaultEmployerId);
          localStorage.setItem("selectedEmployerId", defaultEmployerId.toString());
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

  const handleEmployerChange = async (employerId: number | null) => {
    try {
      // Handle "View All" mode for Super Admins
      if (employerId === null) {
        // Only Super Admins can use View All mode
        if (userData?.role_id !== 1) {
          throw new Error("Only Super Admins can view all companies");
        }
        
        // Clear the employer context
        const { error } = await supabase.rpc('clear_employer_context');
        
        if (error) {
          console.error('Error clearing employer context:', error);
          throw error;
        }
        
        setSelectedEmployerId(null);
        localStorage.setItem("selectedEmployerId", "null");
        
        toast({
          title: "View All Mode",
          description: "Now viewing data from all companies",
        });
      } else {
        // Set specific employer context
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