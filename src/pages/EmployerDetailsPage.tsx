import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EmployerDetails } from "@/components/employer/EmployerDetails";
import type { Employer } from "@/integrations/supabase/types/employer";

export function EmployerDetailsPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: employer, isLoading, error } = useQuery({
    queryKey: ['employer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('*')
        .eq('employer_id', id)
        .single();

      if (error) throw error;
      return data as Employer;
    },
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: async (updatedEmployer: Partial<Employer>) => {
      const { error } = await supabase
        .from('employers')
        .update(updatedEmployer)
        .eq('employer_id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer'] });
      toast("Employer details updated successfully");
    },
    onError: (error) => {
      toast("Failed to update employer details: " + error.message);
    }
  });

  useEffect(() => {
    if (error) {
      toast("Failed to load employer details: " + error.message);
    }
  }, [error]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Employer Details</h1>
      {employer && (
        <EmployerDetails 
          employer={employer} 
          onUpdate={(updates) => mutation.mutate(updates)} 
        />
      )}
    </div>
  );
}