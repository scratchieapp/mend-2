import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Control, useFormContext, useWatch } from "react-hook-form";
import { Worker } from "./types";

interface WorkerSelectorProps {
  control: Control<any>;
}

export function WorkerSelector({ control }: WorkerSelectorProps) {
  const { setValue } = useFormContext();
  
  const selectedEmployerId = useWatch({
    control,
    name: "mend_client",
  });

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['workers', selectedEmployerId],
    queryFn: async () => {
      if (!selectedEmployerId) return [];
      
      console.log('Fetching workers for employer:', selectedEmployerId);
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('employer_id', selectedEmployerId);
      
      if (error) {
        console.error('Error fetching workers:', error);
        throw error;
      }
      
      console.log('Fetched workers:', data);
      return data as Worker[];
    },
    enabled: !!selectedEmployerId,
  });

  return (
    <FormField
      control={control}
      name="worker_id"
      render={({ field }) => (
        <FormItem>
          <Label>Select Worker</Label>
          <Select
            disabled={isLoading || !selectedEmployerId}
            onValueChange={(value) => {
              field.onChange(value);
              const selectedWorker = workers.find(w => w.worker_id.toString() === value);
              if (selectedWorker) {
                setValue('worker_name', `${selectedWorker.given_name} ${selectedWorker.family_name}`);
                setValue('worker_address', selectedWorker.residential_address);
                setValue('worker_phone', selectedWorker.phone_number);
                setValue('worker_dob', selectedWorker.date_of_birth);
                setValue('worker_gender', selectedWorker.gender);
                setValue('employment_type', selectedWorker.employment_type);
              }
            }}
            value={field.value}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedEmployerId ? "Select worker..." : "Select an employer first"} />
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