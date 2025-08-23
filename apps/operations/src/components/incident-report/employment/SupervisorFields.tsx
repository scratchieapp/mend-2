import React from "react";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { FormField, FormItem } from "@/components/ui/form";
import { Control } from "react-hook-form";
import type { IncidentReportFormData } from "@/lib/validations/incident";
interface SupervisorFieldsProps {
  control: Control<IncidentReportFormData>;
}

export function SupervisorFields({ control }: SupervisorFieldsProps) {
  return (
    <div>
      <div className="mb-4">
        <h4 className="text-lg font-medium text-foreground mb-1">Supervisor Information</h4>
        <p className="text-sm text-muted-foreground">Contact details for the immediate supervisor</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={control}
          name="supervisor_contact"
          render={({ field, fieldState }) => (
            <FormItem className="space-y-2">
              <Label htmlFor="supervisor_contact" className="text-sm font-medium text-foreground">Supervisor/Contact *</Label>
              <Input 
                {...field} 
                id="supervisor_contact"
                placeholder="Supervisor's full name"
                className={fieldState.error ? "border-destructive" : ""}
              />
              {fieldState.error && (
                <p className="text-sm text-destructive">{fieldState.error.message}</p>
              )}
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="supervisor_phone"
          render={({ field, fieldState }) => (
            <FormItem className="space-y-2">
              <Label htmlFor="supervisor_phone" className="text-sm font-medium text-foreground">Telephone *</Label>
              <PhoneInput 
                {...field}
                id="supervisor_phone"
                value={field.value}
                onChange={field.onChange}
                error={!!fieldState.error}
              />
              {fieldState.error && (
                <p className="text-sm text-destructive">{fieldState.error.message}</p>
              )}
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}