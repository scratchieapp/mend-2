import { Label } from "@/components/ui/label";
import { FormField, FormItem } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Control } from "react-hook-form";

interface ActionsTakenSectionProps {
  control: Control<any>;
}

export function ActionsTakenSection({ control }: ActionsTakenSectionProps) {
  const actions = [
    { id: "data_input", label: "Data Input" },
    { id: "notification_emailed", label: "Notification Emailed" },
    { id: "worker_contacted", label: "Contact with Worker" },
    { id: "employer_contacted", label: "Contact with Employer" },
    { id: "doctor_contacted", label: "Contact with Doctor" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">Actions Taken</h3>
      <div className="space-y-4">
        {actions.map((action) => (
          <FormField
            key={action.id}
            control={control}
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