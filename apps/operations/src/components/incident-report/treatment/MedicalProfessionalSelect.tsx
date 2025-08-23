import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Control } from "react-hook-form";
import type { IncidentReportFormData } from "@/lib/validations/incident";

interface MedicalProfessional {
  doctor_id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  phone_number: string;
  email: string;
}

interface MedicalProfessionalSelectProps {
  control: Control<IncidentReportFormData>;
}

export function MedicalProfessionalSelect({ control }: MedicalProfessionalSelectProps) {
  const { data: medicalProfessionals } = useQuery({
    queryKey: ['medicalProfessionals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_professionals')
        .select('doctor_id, first_name, last_name, specialty, phone_number, email');
      
      if (error) {
        throw error;
      }
      
      return data as MedicalProfessional[];
    }
  });

  return (
    <FormField
      control={control}
      name="selected_medical_professional"
      render={({ field }) => (
        <FormItem>
          <Label htmlFor="selected_medical_professional">Select Medical Professional</Label>
          <Select 
            value={field.value}
            onValueChange={field.onChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a medical professional" />
            </SelectTrigger>
            <SelectContent>
              {medicalProfessionals?.map((professional) => (
                <SelectItem 
                  key={professional.doctor_id} 
                  value={professional.doctor_id.toString()}
                >
                  {`${professional.first_name} ${professional.last_name}, ${professional.specialty}, ${professional.phone_number}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
}