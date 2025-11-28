import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Control } from "react-hook-form";
import type { IncidentReportFormData } from "@/lib/validations/incident";

interface FirstAidSectionProps {
  control: Control<IncidentReportFormData>;
}

const REFERRAL_OPTIONS = [
  { value: "none", label: "None" },
  { value: "hospital", label: "Hospital" },
  { value: "gp", label: "GP" },
  { value: "specialist", label: "Specialist" },
  { value: "physio", label: "Physio" },
];

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
            <Select
              value={field.value || "none"}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="referred_to">
                <SelectValue placeholder="Select referral..." />
              </SelectTrigger>
              <SelectContent>
                {REFERRAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
    </>
  );
}