import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn, useWatch } from "react-hook-form";
import type { IncidentReportFormData, IncidentEditFormData } from "@/lib/validations/incident";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ExpandedInjuryDetails } from "./injury/ExpandedInjuryDetails";
import { BodyInjuryDiagram } from "./BodyInjuryDiagram";

interface InjuryDetailsSectionProps {
  form: UseFormReturn<IncidentReportFormData> | UseFormReturn<IncidentEditFormData>;
}

interface InjuryType {
  type_id: number;
  type_name: string;
}

interface BodyPart {
  body_part_id: number;
  body_part_name: string;
}

interface UIRegionMapping {
  svg_id: string;
  body_part_id: number | null;
  body_side_id: number | null;
}

// Mapping from body_part_name to relevant SVG region IDs
// This allows the dropdown to highlight the diagram when selected
const BODY_PART_TO_REGIONS: Record<string, string[]> = {
  'Head': ['front-head', 'back-head'],
  'Neck': ['front-neck', 'back-neck'],
  'Chest': ['front-chest'],
  'Abdomen': ['front-abdomen'],
  'Upper Back': ['back-upperback'],
  'Lower Back': ['back-lowerback'],
  'Pelvis': ['front-pelvis'],
  'Groin': ['front-pelvis'],
  'Glutes': ['back-glutes'],
  'Shoulder': ['front-shoulder-left', 'front-shoulder-right', 'back-shoulder-left', 'back-shoulder-right'],
  'Left Shoulder': ['front-shoulder-left', 'back-shoulder-left'],
  'Right Shoulder': ['front-shoulder-right', 'back-shoulder-right'],
  'Upper Arm': ['front-upperarm-left', 'front-upperarm-right', 'back-upperarm-left', 'back-upperarm-right'],
  'Left Upper Arm': ['front-upperarm-left', 'back-upperarm-left'],
  'Right Upper Arm': ['front-upperarm-right', 'back-upperarm-right'],
  'Forearm': ['front-forearmhand-left', 'front-forearmhand-right', 'back-forearmhand-left', 'back-forearmhand-right'],
  'Left Forearm': ['front-forearmhand-left', 'back-forearmhand-left'],
  'Right Forearm': ['front-forearmhand-right', 'back-forearmhand-right'],
  'Hand': ['front-forearmhand-left', 'front-forearmhand-right', 'back-forearmhand-left', 'back-forearmhand-right'],
  'Left Hand': ['front-forearmhand-left', 'back-forearmhand-left'],
  'Right Hand': ['front-forearmhand-right', 'back-forearmhand-right'],
  'Thigh': ['front-thigh-left', 'front-thigh-right', 'back-thigh-left', 'back-thigh-right'],
  'Left Thigh': ['front-thigh-left', 'back-thigh-left'],
  'Right Thigh': ['front-thigh-right', 'back-thigh-right'],
  'Knee': ['front-knee-left', 'front-knee-right'],
  'Left Knee': ['front-knee-left'],
  'Right Knee': ['front-knee-right'],
  'Shin': ['front-shin-left', 'front-shin-right'],
  'Left Shin': ['front-shin-left'],
  'Right Shin': ['front-shin-right'],
  'Calf': ['back-calf-left', 'back-calf-right'],
  'Left Calf': ['back-calf-left'],
  'Right Calf': ['back-calf-right'],
  'Foot': ['front-foot-left', 'front-foot-right', 'back-foot-left', 'back-foot-right'],
  'Left Foot': ['front-foot-left', 'back-foot-left'],
  'Right Foot': ['front-foot-right', 'back-foot-right'],
  'Ankle': ['front-foot-left', 'front-foot-right', 'back-foot-left', 'back-foot-right'],
  'Left Ankle': ['front-foot-left', 'back-foot-left'],
  'Right Ankle': ['front-foot-right', 'back-foot-right'],
  'Arm': ['front-upperarm-left', 'front-upperarm-right', 'front-forearmhand-left', 'front-forearmhand-right', 'back-upperarm-left', 'back-upperarm-right', 'back-forearmhand-left', 'back-forearmhand-right'],
  'Leg': ['front-thigh-left', 'front-thigh-right', 'front-knee-left', 'front-knee-right', 'front-shin-left', 'front-shin-right', 'front-foot-left', 'front-foot-right', 'back-thigh-left', 'back-thigh-right', 'back-calf-left', 'back-calf-right', 'back-foot-left', 'back-foot-right'],
  'Back': ['back-upperback', 'back-lowerback'],
  'Trunk': ['front-chest', 'front-abdomen', 'back-upperback', 'back-lowerback'],
};

export function InjuryDetailsSection({ form }: InjuryDetailsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [injuryTypes, setInjuryTypes] = useState<InjuryType[]>([]);
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>("");
  const [uiRegions, setUiRegions] = useState<UIRegionMapping[]>([]);
  
  // Watch body_regions from form to sync with the diagram
  const formBodyRegions = useWatch({
    control: form.control,
    name: "body_regions",
    defaultValue: [],
  });
  
  // Watch body_part from form
  const formBodyPart = useWatch({
    control: form.control,
    name: "body_part",
  });
  
  // Sync local state with form value
  const [selectedBodyRegions, setSelectedBodyRegions] = useState<string[]>(formBodyRegions || []);
  
  // Get body part name from ID
  const getBodyPartName = useCallback((bodyPartId: string): string => {
    const part = bodyParts.find(p => p.body_part_id.toString() === bodyPartId);
    return part?.body_part_name || '';
  }, [bodyParts]);
  
  // Get body part ID from region
  const getBodyPartIdFromRegion = useCallback((regionId: string): string | null => {
    const region = uiRegions.find(r => r.svg_id === regionId);
    return region?.body_part_id?.toString() || null;
  }, [uiRegions]);
  
  // Update diagram when body part dropdown changes
  useEffect(() => {
    if (formBodyPart && bodyParts.length > 0) {
      const bodyPartName = getBodyPartName(formBodyPart);
      if (bodyPartName) {
        // Find matching regions for this body part
        const matchingRegions = BODY_PART_TO_REGIONS[bodyPartName] || [];
        
        // Also check for partial matches
        const partialMatches: string[] = [];
        Object.entries(BODY_PART_TO_REGIONS).forEach(([name, regions]) => {
          if (bodyPartName.toLowerCase().includes(name.toLowerCase()) || 
              name.toLowerCase().includes(bodyPartName.toLowerCase())) {
            partialMatches.push(...regions);
          }
        });
        
        const allMatches = [...new Set([...matchingRegions, ...partialMatches])];
        
        if (allMatches.length > 0 && selectedBodyRegions.length === 0) {
          // Only auto-set if no regions are currently selected
          setSelectedBodyRegions(allMatches);
          form.setValue('body_regions', allMatches, { shouldDirty: true });
        }
      }
      setSelectedBodyPart(formBodyPart);
    }
  }, [formBodyPart, bodyParts, getBodyPartName, form]);
  
  // Update form when local state changes (from diagram clicks)
  const handleRegionsChange = useCallback((regions: string[]) => {
    setSelectedBodyRegions(regions);
    form.setValue('body_regions', regions, { shouldDirty: true });
    
    // If only one region selected, try to set the body part dropdown
    if (regions.length === 1 && uiRegions.length > 0) {
      const bodyPartId = getBodyPartIdFromRegion(regions[0]);
      if (bodyPartId && bodyPartId !== formBodyPart) {
        form.setValue('body_part', bodyPartId, { shouldDirty: true });
        setSelectedBodyPart(bodyPartId);
      }
    }
  }, [form, uiRegions, getBodyPartIdFromRegion, formBodyPart]);
  
  // Sync local state when form value changes (e.g., on edit load)
  useEffect(() => {
    if (formBodyRegions && JSON.stringify(formBodyRegions) !== JSON.stringify(selectedBodyRegions)) {
      setSelectedBodyRegions(formBodyRegions);
    }
  }, [formBodyRegions]);

  useEffect(() => {
    const fetchData = async () => {
      // Use RBAC-aware RPC to fetch lookup data (bypasses RLS)
      const { data: lookupData, error: lookupError } = await supabase.rpc('get_lookup_data');
      
      if (lookupError) {
        console.error('Error fetching lookup data via RPC:', lookupError);
        // Fallback to direct table queries
        const { data: typesData } = await supabase
          .from('injury_type')
          .select('id, injury_type_name');
        
        if (typesData) {
          setInjuryTypes(typesData.map(type => ({
            type_id: type.id,
            type_name: type.injury_type_name
          })));
        }

        const { data: partsData } = await supabase
          .from('body_parts')
          .select('body_part_id, body_part_name');
        
        if (partsData) {
          setBodyParts(partsData);
        }
      } else if (lookupData) {
        // Use RPC data
        setInjuryTypes(lookupData.injury_types || []);
        setBodyParts(lookupData.body_parts || []);
      }
      
      // Fetch UI regions mapping
      const { data: uiRegionsData } = await supabase
        .from('ui_regions')
        .select('svg_id, body_part_id, body_side_id');
      
      if (uiRegionsData) {
        setUiRegions(uiRegionsData);
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
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Select injury type" />
                </SelectTrigger>
                <SelectContent>
                  {injuryTypes.map((type) => (
                    <SelectItem key={type.type_id} value={type.type_name}>
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
                value={field.value || ''}
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
              <Input {...field} value={field.value || ''} id="date_of_injury" type="date" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="time_of_injury"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="time_of_injury">Time of Injury</Label>
              <Input {...field} value={field.value || ''} id="time_of_injury" type="time" />
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
                <Textarea {...field} value={field.value || ''} id="injury_description" />
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
              <Input {...field} value={field.value || ''} id="witness" />
            </FormItem>
          )}
        />
        
        <div className="col-span-full">
          <BodyInjuryDiagram
            selectedRegions={selectedBodyRegions}
            onRegionsChange={handleRegionsChange}
          />
        </div>

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