import { Label } from "@/components/ui/label";
import { FormField, FormItem } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import type { IncidentReportFormData } from "@/lib/validations/incident";
interface ActionsTakenSectionProps {
  form: UseFormReturn<IncidentReportFormData>;
}

export function ActionsTakenSection({ form }: ActionsTakenSectionProps) {
  const actions = [
    { id: "data_input", label: "Data Input" },
    { id: "notification_emailed", label: "Notification Emailed" },
    { id: "worker_contacted", label: "Contact with Worker" },
    { id: "employer_contacted", label: "Contact with Employer" },
    { id: "doctor_contacted", label: "Contact with Doctor" },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {actions.map((action) => (
          <FormField
            key={action.id}
            control={form.control}
            name="actions_taken"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <Checkbox
                  id={action.id}
                  checked={(field.value || []).includes(action.id)}
                  onCheckedChange={(checked) => {
                    const currentActions = field.value || [];
                    const newActions = checked
                      ? [...currentActions, action.id]
                      : currentActions.filter((id: string) => id !== action.id);
                    field.onChange(newActions);
                  }}
                />
                <Label htmlFor={action.id}>{action.label}</Label>
              </FormItem>
            )}
          />
        ))}
      </div>
    </div>
  );
}