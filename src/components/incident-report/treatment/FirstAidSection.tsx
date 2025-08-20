import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Control } from "react-hook-form";
import type { IncidentReportFormData } from "@/lib/validations/incident";

interface FirstAidSectionProps {
  control: Control<IncidentReportFormData>;
}

export function FirstAidSection({ control }: FirstAidSectionProps) {
  return (
    <>
      <FormField
        control={control}
        name="type_of_first_aid"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="type_of_first_aid">Type of First Aid</Label>
            <Input {...field} id="type_of_first_aid" required />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="referred_to"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="referred_to">Referred To</Label>
            <Input {...field} id="referred_to" />
          </FormItem>
        )}
      />
    </>
  );
}