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
      // Fetch body sides
      const { data: bodySidesData, error: bodySidesError } = await supabase
        .from('body_sides')
        .select('body_side_id, body_side_name');
      
      if (bodySidesError) {
        console.error('Error fetching body sides:', bodySidesError);
      } else if (bodySidesData) {
        setBodySides(bodySidesData);
      }

      // Fetch mechanisms of injury with correct column names
      const { data: mechanismsData, error: mechanismsError } = await supabase
        .from('mechanism_of_injury_codes')
        .select('moi_code_id, moi_description, moi_code_main, moi_code_sub');
      
      if (mechanismsError) {
        console.error('Error fetching mechanisms:', mechanismsError);
      } else if (mechanismsData) {
        setMechanisms(mechanismsData);
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