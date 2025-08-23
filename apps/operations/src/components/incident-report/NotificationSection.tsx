import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
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
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Provide information about the person reporting this incident</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="mend_client"
          render={({ field, fieldState }) => (
            <FormItem className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Mend Client *</Label>
              <Select
                disabled={isLoading}
                onValueChange={field.onChange}
                value={field.value}
              >
                <SelectTrigger className={fieldState.error ? "border-destructive" : ""}>
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
              {fieldState.error && (
                <p className="text-sm text-destructive">{fieldState.error.message}</p>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notifying_person_name"
          render={({ field, fieldState }) => (
            <FormItem className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Person Notifying *</Label>
              <Input 
                {...field} 
                placeholder="Full name"
                className={fieldState.error ? "border-destructive" : ""}
              />
              {fieldState.error && (
                <p className="text-sm text-destructive">{fieldState.error.message}</p>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notifying_person_position"
          render={({ field, fieldState }) => (
            <FormItem className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Position *</Label>
              <Input 
                {...field} 
                placeholder="Job title or role"
                className={fieldState.error ? "border-destructive" : ""}
              />
              {fieldState.error && (
                <p className="text-sm text-destructive">{fieldState.error.message}</p>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notifying_person_telephone"
          render={({ field, fieldState }) => (
            <FormItem className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Telephone *</Label>
              <PhoneInput 
                value={field.value}
                onChange={field.onChange}
                error={!!fieldState.error}
              />
              {fieldState.error && (
                <p className="text-sm text-destructive">{fieldState.error.message}</p>
              )}
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}