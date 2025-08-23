import React, { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { FormField, FormItem } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Control, useFormContext, useWatch } from "react-hook-form";
import type { IncidentReportFormData } from "@/lib/validations/incident";
import { useQuery } from "@tanstack/react-query";
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
  const { setValue, getValues } = useFormContext();
  
  const selectedEmployerId = useWatch({
    control,
    name: "mend_client"
  });
  
  const currentSiteId = useWatch({
    control,
    name: "location_site"
  });

  // For edit mode, fetch all sites if we have a site_id but no employer selected
  const shouldFetchAllSites = !selectedEmployerId && !!currentSiteId;

  const { data: locations = [], isLoading: isLoadingLocations } = useQuery({
    queryKey: ['sites', selectedEmployerId, shouldFetchAllSites],
    queryFn: async () => {
      let query = supabase.from('sites').select('*');
      
      if (shouldFetchAllSites) {
        // In edit mode, fetch all sites to ensure we can display the current one
        query = query.order('site_name', { ascending: true });
      } else if (selectedEmployerId) {
        // In create mode or when employer is selected
        query = query.eq('employer_id', selectedEmployerId);
      } else {
        return [];
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching locations:', error);
        throw error;
      }
      
      return data as Site[];
    },
    enabled: !!selectedEmployerId || shouldFetchAllSites,
  });
  
  // Auto-populate supervisor details when sites are loaded and we have a site_id
  useEffect(() => {
    if (currentSiteId && locations.length > 0) {
      const selectedLocation = locations.find(loc => loc.site_id.toString() === currentSiteId);
      if (selectedLocation && !getValues('supervisor_contact')) {
        setValue('supervisor_contact', selectedLocation.supervisor_name);
        setValue('supervisor_phone', selectedLocation.supervisor_telephone);
      }
    }
  }, [locations, currentSiteId, setValue, getValues]);

  return (
    <FormField
      control={control}
      name="location_site"
      render={({ field }) => (
        <FormItem>
          <Label>Location/Site</Label>
          <Select
            disabled={isLoadingLocations || (!selectedEmployerId && !shouldFetchAllSites)}
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
              <SelectValue placeholder={
                isLoadingLocations ? "Loading sites..." :
                (selectedEmployerId || shouldFetchAllSites) ? "Select location..." :
                "Select an employer first"
              } />
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