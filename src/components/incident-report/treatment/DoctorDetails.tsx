import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Control } from "react-hook-form";
import type { IncidentReportFormData } from "@/lib/validations/incident";

interface DoctorDetailsProps {
  control: Control<IncidentReportFormData>;
}

export function DoctorDetails({ control }: DoctorDetailsProps) {
  return (
    <FormField
      control={control}
      name="doctor_details"
      render={({ field }) => (
        <FormItem>
          <Label htmlFor="doctor_details">Additional Medical Professional Details (Optional)</Label>
          <Textarea {...field} id="doctor_details" />
        </FormItem>
      )}
    />
  );
}