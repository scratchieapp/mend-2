import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from "react-hook-form";
import type { IncidentReportFormData } from "@/lib/validations/incident";import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ExpandedInjuryDetails } from "./injury/ExpandedInjuryDetails";

interface InjuryDetailsSectionProps {
  form: UseFormReturn<IncidentReportFormData>;
}

interface InjuryType {
  type_id: number;
  type_name: string;
}

interface BodyPart {
  body_part_id: number;
  body_part_name: string;
}

export function InjuryDetailsSection({ form }: InjuryDetailsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [injuryTypes, setInjuryTypes] = useState<InjuryType[]>([]);
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch injury types from injury_type table
      const { data: typesData, error: typesError } = await supabase
        .from('injury_type')
        .select('id, injury_type_name');
      
      if (!typesError && typesData) {
        setInjuryTypes(typesData.map(type => ({
          type_id: type.id,
          type_name: type.injury_type_name
        })));
      }

      // Fetch body parts
      const { data: partsData, error: partsError } = await supabase
        .from('body_parts')
        .select('body_part_id, body_part_name');
      
      if (!partsError && partsData) {
        setBodyParts(partsData);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="injury_type"
          render={({ field }) => (
            <FormItem>
              <Label>Type of Injury</Label>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select injury type" />
                </SelectTrigger>
                <SelectContent>
                  {injuryTypes.map((type) => (
                    <SelectItem key={type.type_id} value={type.type_id.toString()}>
                      {type.type_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body_part"
          render={({ field }) => (
            <FormItem>
              <Label>Body Part</Label>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value);
                  setSelectedBodyPart(value);
                }} 
                value={field.value}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select body part" />
                </SelectTrigger>
                <SelectContent>
                  {bodyParts.map((part) => (
                    <SelectItem key={part.body_part_id} value={part.body_part_id.toString()}>
                      {part.body_part_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date_of_injury"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="date_of_injury">Date of Injury</Label>
              <Input {...field} id="date_of_injury" type="date" required />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="time_of_injury"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="time_of_injury">Time of Injury</Label>
              <Input {...field} id="time_of_injury" type="time" required />
            </FormItem>
          )}
        />

        <div className="col-span-full">
          <FormField
            control={form.control}
            name="injury_description"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="injury_description">Description of Injury</Label>
                <Textarea {...field} id="injury_description" required />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="witness"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="witness">Witness</Label>
              <Input {...field} id="witness" />
            </FormItem>
          )}
        />

        <div className="col-span-full">
          <Button
            type="button"
            variant="ghost"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Less Details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                More Details
              </>
            )}
          </Button>

          {isExpanded && (
            <ExpandedInjuryDetails 
              control={form.control} 
              selectedBodyPart={selectedBodyPart}
            />
          )}
        </div>
      </div>
    </div>
  );
}