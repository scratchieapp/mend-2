import { useState, useEffect } from "react";
import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BodilyLocationSelector } from "./BodilyLocationSelector";
import { ExpandedInjuryDetailsProps, BodySide, MechanismOfInjury } from "./types";

export function ExpandedInjuryDetails({ control, selectedBodyPart }: ExpandedInjuryDetailsProps) {
  const [bodySides, setBodySides] = useState<BodySide[]>([]);
  const [mechanisms, setMechanisms] = useState<MechanismOfInjury[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Use RBAC-aware RPC to fetch lookup data (bypasses RLS)
      const { data: lookupData, error: lookupError } = await supabase.rpc('get_lookup_data');
      
      if (lookupError) {
        console.error('Error fetching lookup data via RPC:', lookupError);
        // Fallback to direct table queries
        const { data: bodySidesData } = await supabase
          .from('body_sides')
          .select('body_side_id, body_side_name');
        
        if (bodySidesData) {
          setBodySides(bodySidesData);
        }

        const { data: mechanismsData } = await supabase
          .from('mechanism_of_injury_codes')
          .select('moi_code_id, moi_description, moi_code_main, moi_code_sub');
        
        if (mechanismsData) {
          setMechanisms(mechanismsData);
        }
      } else if (lookupData) {
        // Use RPC data
        setBodySides(lookupData.body_sides || []);
        setMechanisms(lookupData.mechanism_of_injury || []);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-4 mt-4">
      <FormField
        control={control}
        name="mechanism_of_injury"
        render={({ field }) => (
          <FormItem>
            <Label>Mechanism of Injury</Label>
            <Select onValueChange={field.onChange} value={field.value || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Select mechanism of injury" />
              </SelectTrigger>
              <SelectContent>
                {mechanisms.map((mechanism) => (
                  <SelectItem 
                    key={mechanism.moi_code_id} 
                    value={mechanism.moi_code_id.toString()}
                  >
                    {mechanism.moi_description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="body_side"
        render={({ field }) => (
          <FormItem>
            <Label>Body Side</Label>
            <Select onValueChange={field.onChange} value={field.value || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Select body side" />
              </SelectTrigger>
              <SelectContent>
                {bodySides.map((side) => (
                  <SelectItem key={side.body_side_id} value={side.body_side_id.toString()}>
                    {side.body_side_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      <BodilyLocationSelector control={control} selectedBodyPart={selectedBodyPart} />
    </div>
  );
}