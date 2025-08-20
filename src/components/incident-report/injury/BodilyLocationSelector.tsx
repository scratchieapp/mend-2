import { useState, useEffect } from "react";
import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Control } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { BodilyLocation } from "./types";

interface BodilyLocationSelectorProps {
  control: Control<any>;
  selectedBodyPart: string;
}

export function BodilyLocationSelector({ control, selectedBodyPart }: BodilyLocationSelectorProps) {
  const [bodilyLocations, setBodilyLocations] = useState<BodilyLocation[]>([]);

  useEffect(() => {
    const fetchBodilyLocations = async () => {
      if (!selectedBodyPart) return;

      console.log('Fetching bodily locations for body part:', selectedBodyPart);
      
      // 1. Get the related bl_code_ids from the join table
      const { data: relatedCodes, error: joinError } = await supabase
        .from('body_parts_bodily_codes')
        .select('bl_code_id')
        .eq('body_part_id', parseInt(selectedBodyPart));

      if (joinError) {
        console.error('Error fetching related codes:', joinError);
        return;
      }

      if (!relatedCodes?.length) {
        console.log('No related codes found for body part:', selectedBodyPart);
        setBodilyLocations([]);
        return;
      }

      // 2. Get the bl_code_ids array
      const codeIds = relatedCodes.map(row => row.bl_code_id);
      console.log('Related code IDs:', codeIds);

      // 3. Fetch the actual bodily location details
      const { data: locationData, error: locationError } = await supabase
        .from('bodily_location_codes')
        .select('bl_code_id, bl_description, bl_code_main, bl_code_sub')
        .in('bl_code_id', codeIds);

      if (locationError) {
        console.error('Error fetching bodily locations:', locationError);
        return;
      }

      if (locationData) {
        console.log('Fetched bodily locations:', locationData);
        setBodilyLocations(locationData);
      }
    };

    fetchBodilyLocations();
  }, [selectedBodyPart]);

  return (
    <FormField
      control={control}
      name="bodily_location_detail"
      render={({ field }) => (
        <FormItem>
          <Label>Specific Location</Label>
          <Select
            disabled={!selectedBodyPart || bodilyLocations.length === 0}
            onValueChange={field.onChange}
            value={field.value}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                !selectedBodyPart 
                  ? "Select a body part first" 
                  : bodilyLocations.length === 0 
                    ? "No specific locations available" 
                    : "Select specific location"
              } />
            </SelectTrigger>
            <SelectContent>
              {bodilyLocations.map((location) => (
                <SelectItem
                  key={location.bl_code_id}
                  value={location.bl_code_id.toString()}
                >
                  {location.bl_description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
}