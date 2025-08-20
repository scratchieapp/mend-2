import React from "react";
import { Label } from "@/components/ui/label";
import { FormField, FormItem } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Control, useFormContext, useWatch } from "react-hook-form";
import type { IncidentReportFormData } from "@/lib/validations/incident";import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Site {
  site_id: number;
  site_name: string;
  supervisor_name: string;
  supervisor_telephone: string;
  employer_id: number;
}

interface LocationFieldProps {
  control: Control<IncidentReportFormData>;
}

export function LocationField({ control }: LocationFieldProps) {
  const { setValue } = useFormContext();
  
  const selectedEmployerId = useWatch({
    control,
    name: "mend_client"
  });

  const { data: locations = [], isLoading: isLoadingLocations } = useQuery({
    queryKey: ['sites', selectedEmployerId],
    queryFn: async () => {
      if (!selectedEmployerId) return [];
      
      console.log('Fetching locations for employer:', selectedEmployerId);
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('employer_id', selectedEmployerId);
      
      if (error) {
        console.error('Error fetching locations:', error);
        throw error;
      }
      
      console.log('Fetched locations:', data);
      return data as Site[];
    },
    enabled: !!selectedEmployerId,
  });

  return (
    <FormField
      control={control}
      name="location_site"
      render={({ field }) => (
        <FormItem>
          <Label>Location/Site</Label>
          <Select
            disabled={isLoadingLocations || !selectedEmployerId}
            onValueChange={(value) => {
              field.onChange(value);
              const selectedLocation = locations.find(loc => loc.site_id.toString() === value);
              if (selectedLocation) {
                setValue('supervisor_contact', selectedLocation.supervisor_name);
                setValue('supervisor_phone', selectedLocation.supervisor_telephone);
              }
            }}
            value={field.value}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedEmployerId ? "Select location..." : "Select an employer first"} />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem 
                  key={location.site_id} 
                  value={location.site_id.toString()}
                >
                  {location.site_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
}