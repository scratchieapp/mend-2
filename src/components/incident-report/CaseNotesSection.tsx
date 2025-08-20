import { Label } from "@/components/ui/label";
import { FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Control } from "react-hook-form";

interface CaseNotesSectionProps {
  control: Control<any>;
}

export function CaseNotesSection({ control }: CaseNotesSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">Case Notes</h3>
      <FormField
        control={control}
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