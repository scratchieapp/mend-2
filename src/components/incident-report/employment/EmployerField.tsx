import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField, FormItem } from "@/components/ui/form";
import { Control } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFormContext, useWatch } from "react-hook-form";
import { useUserMode } from "@/hooks/useUserMode";

interface EmployerFieldProps {
  control: Control<any>;
}

export function EmployerField({ control }: EmployerFieldProps) {
  const { setValue } = useFormContext();
  const { currentMode } = useUserMode();
  
  const selectedEmployerId = useWatch({
    control,
    name: "mend_client"
  });

  const { data: employerData, isLoading } = useQuery({
    queryKey: ['employer', selectedEmployerId],
    queryFn: async () => {
      if (!selectedEmployerId) return null;
      
      const { data, error } = await supabase
        .from('employers')
        .select('employer_name')
        .eq('employer_id', selectedEmployerId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEmployerId,
  });

  // Set employer name when data is loaded
  React.useEffect(() => {
    if (employerData?.employer_name) {
      setValue('employer_name', employerData.employer_name);
    }
  }, [employerData, setValue]);

  // If in builder mode, automatically set the employer based on RLS
  React.useEffect(() => {
    if (currentMode === 'builder') {
      const fetchEmployer = async () => {
        const { data, error } = await supabase
          .from('employers')
          .select('employer_id, employer_name')
          .single();

        if (!error && data) {
          setValue('mend_client', data.employer_id);
          setValue('employer_name', data.employer_name);
        }
      };

      fetchEmployer();
    }
  }, [currentMode, setValue]);

  return (
    <FormField
      control={control}
      name="employer_name"
      render={({ field }) => (
        <FormItem>
          <Label htmlFor="employer_name">Worker's Employer</Label>
          <Input 
            {...field} 
            id="employer_name" 
            readOnly={currentMode === 'builder'}
          />
        </FormItem>
      )}
    />
  );
}