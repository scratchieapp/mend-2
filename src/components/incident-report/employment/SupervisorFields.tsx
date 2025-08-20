import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField, FormItem } from "@/components/ui/form";
import { Control } from "react-hook-form";

interface SupervisorFieldsProps {
  control: Control<any>;
}

export function SupervisorFields({ control }: SupervisorFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={control}
        name="supervisor_contact"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="supervisor_contact">Supervisor/Contact</Label>
            <Input {...field} id="supervisor_contact" />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="supervisor_phone"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="supervisor_phone">Telephone</Label>
            <Input {...field} id="supervisor_phone" type="tel" />
          </FormItem>
        )}
      />
    </div>
  );
}