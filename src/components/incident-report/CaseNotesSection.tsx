import { Label } from "@/components/ui/label";
import { FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from "react-hook-form";
import type { IncidentReportFormData } from "@/lib/validations/incident";
interface CaseNotesSectionProps {
  form: UseFormReturn<IncidentReportFormData>;
}

export function CaseNotesSection({ form }: CaseNotesSectionProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="case_notes"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="case_notes">Notes</Label>
            <Textarea {...field} id="case_notes" className="min-h-[100px]" />
          </FormItem>
        )}
      />
    </div>
  );
}