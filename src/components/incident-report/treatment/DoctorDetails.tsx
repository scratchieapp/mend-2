import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Control } from "react-hook-form";

interface DoctorDetailsProps {
  control: Control<any>;
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