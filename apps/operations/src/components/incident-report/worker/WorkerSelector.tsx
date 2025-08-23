import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Control, useFormContext, useWatch } from "react-hook-form";
import { Worker } from "./types";
import type { IncidentReportFormData } from "@/lib/validations/incident";
import { useEffect } from "react";

interface WorkerSelectorProps {
  control: Control<IncidentReportFormData>;
}

export function WorkerSelector({ control }: WorkerSelectorProps) {
  const { setValue, getValues } = useFormContext();
  
  const selectedEmployerId = useWatch({
    control,
    name: "mend_client",
  });
  
  const currentWorkerId = useWatch({
    control,
    name: "worker_id",
  });

  // For edit mode, fetch all workers if we have a worker_id but no employer selected
  const shouldFetchAllWorkers = !selectedEmployerId && !!currentWorkerId;

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['workers', selectedEmployerId, shouldFetchAllWorkers],
    queryFn: async () => {
      let query = supabase.from('workers').select('*');
      
      if (shouldFetchAllWorkers) {
        // In edit mode, fetch all workers to ensure we can display the current one
        query = query.order('given_name', { ascending: true });
      } else if (selectedEmployerId) {
        // In create mode or when employer is selected
        query = query.eq('employer_id', selectedEmployerId);
      } else {
        return [];
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data as Worker[];
    },
    enabled: !!selectedEmployerId || shouldFetchAllWorkers,
  });
  
  // Auto-populate worker details when workers are loaded and we have a worker_id
  useEffect(() => {
    if (currentWorkerId && workers.length > 0) {
      const selectedWorker = workers.find(w => w.worker_id.toString() === currentWorkerId);
      if (selectedWorker && !getValues('worker_name')) {
        setValue('worker_name', `${selectedWorker.given_name} ${selectedWorker.family_name}`);
        setValue('worker_address', selectedWorker.residential_address);
        setValue('worker_phone', selectedWorker.phone_number);
        setValue('worker_dob', selectedWorker.date_of_birth);
        setValue('worker_gender', selectedWorker.gender);
        if (selectedWorker.employment_type) {
          setValue('employment_type', selectedWorker.employment_type);
        }
      }
    }
  }, [workers, currentWorkerId, setValue, getValues]);

  return (
    <FormField
      control={control}
      name="worker_id"
      render={({ field }) => (
        <FormItem>
          <Label>Select Worker</Label>
          <Select
            disabled={isLoading || (!selectedEmployerId && !shouldFetchAllWorkers)}
            onValueChange={(value) => {
              field.onChange(value);
              const selectedWorker = workers.find(w => w.worker_id.toString() === value);
              if (selectedWorker) {
                setValue('worker_name', `${selectedWorker.given_name} ${selectedWorker.family_name}`);
                setValue('worker_address', selectedWorker.residential_address);
                setValue('worker_phone', selectedWorker.phone_number);
                setValue('worker_dob', selectedWorker.date_of_birth);
                setValue('worker_gender', selectedWorker.gender);
                if (selectedWorker.employment_type) {
                  setValue('employment_type', selectedWorker.employment_type);
                }
              }
            }}
            value={field.value}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                isLoading ? "Loading workers..." : 
                (selectedEmployerId || shouldFetchAllWorkers) ? "Select worker..." : 
                "Select an employer first"
              } />
            </SelectTrigger>
            <SelectContent>
              {workers.map((worker) => (
                <SelectItem 
                  key={worker.worker_id} 
                  value={worker.worker_id.toString()}
                >
                  {`${worker.given_name} ${worker.family_name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
}