import { Label } from "@/components/ui/label";
import { FormField, FormItem } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { Bot, UserCheck, Phone, Building2, Stethoscope, Mail } from "lucide-react";
import type { IncidentReportFormData } from "@/lib/validations/incident";

interface ActionsTakenSectionProps {
  form: UseFormReturn<IncidentReportFormData>;
}

// Action types for incident management workflow
// These can be used for filtering incidents by action status at MEND level
export const INCIDENT_ACTIONS = [
  { 
    id: "voice_agent_call", 
    label: "Voice Agent Call", 
    description: "AI voice agent received/made a call",
    icon: Bot,
    autoSet: true // Set automatically by system
  },
  { 
    id: "incident_validated", 
    label: "Incident Validated", 
    description: "Human reviewed and validated the incident details",
    icon: UserCheck,
    autoSet: false
  },
  { 
    id: "worker_contacted", 
    label: "Contact with Worker", 
    description: "Direct communication with the injured worker",
    icon: Phone,
    autoSet: false
  },
  { 
    id: "employer_contacted", 
    label: "Contact with Employer", 
    description: "Communication with the worker's employer",
    icon: Building2,
    autoSet: false
  },
  { 
    id: "doctor_contacted", 
    label: "Contact with Doctor", 
    description: "Communication with treating medical professional",
    icon: Stethoscope,
    autoSet: false
  },
  { 
    id: "notification_emailed", 
    label: "Notification Emailed", 
    description: "Email notification sent to relevant parties",
    icon: Mail,
    autoSet: false
  },
] as const;

export type ActionId = typeof INCIDENT_ACTIONS[number]['id'];

export function ActionsTakenSection({ form }: ActionsTakenSectionProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">
        Track actions taken for this incident. These help case coordinators understand the current status.
      </p>
      <div className="space-y-3">
        {INCIDENT_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <FormField
              key={action.id}
              control={form.control}
              name="actions_taken"
              render={({ field }) => (
                <FormItem className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
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
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-1">
                    <Label 
                      htmlFor={action.id} 
                      className="flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {action.label}
                      {action.autoSet && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          Auto
                        </span>
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </FormItem>
              )}
            />
          );
        })}
      </div>
    </div>
  );
}