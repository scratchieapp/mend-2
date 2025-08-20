import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField, FormItem } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { IncidentReportFormData } from "@/lib/validations/incident";

interface NotificationSectionProps {
  form: UseFormReturn<IncidentReportFormData>;
}

interface Employer {
  employer_id: number;
  employer_name: string;
  employer_state: string;
}

export function NotificationSection({ form }: NotificationSectionProps) {
  const { data: employers = [], isLoading } = useQuery({
    queryKey: ['employers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name, employer_state')
        .order('employer_name');
      
      if (error) {
        throw error;
      }
      
      return data as Employer[];
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">Notification Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="mend_client"
          render={({ field }) => (
            <FormItem>
              <Label>Mend Client</Label>
              <Select
                disabled={isLoading}
                onValueChange={field.onChange}
                value={field.value}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {employers.map((employer) => (
                    <SelectItem 
                      key={employer.employer_id} 
                      value={employer.employer_id.toString()}
                    >
                      {employer.employer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notifying_person_name"
          render={({ field }) => (
            <FormItem>
              <Label>Person Notifying</Label>
              <Input {...field} required />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notifying_person_position"
          render={({ field }) => (
            <FormItem>
              <Label>Position</Label>
              <Input {...field} required />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notifying_person_telephone"
          render={({ field }) => (
            <FormItem>
              <Label>Telephone</Label>
              <Input {...field} type="tel" required />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}