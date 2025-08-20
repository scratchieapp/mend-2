import React from "react";
import { Label } from "@/components/ui/label";
import { FormField, FormItem } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Control } from "react-hook-form";

interface EmploymentTypeFieldProps {
  control: Control<any>;
}

export function EmploymentTypeField({ control }: EmploymentTypeFieldProps) {
  const employmentTypes = [
    { id: "full_time", label: "Full Time" },
    { id: "part_time", label: "Part Time" },
    { id: "casual", label: "Casual" },
    { id: "labour_hire", label: "Labour Hire" },
    { id: "contractor", label: "Contractor" },
  ];

  return (
    <div className="space-y-2">
      <Label>Employment Type</Label>
      <div className="flex flex-wrap gap-4">
        {employmentTypes.map((type) => (
          <FormField
            key={type.id}
            control={control}
            name="employment_type"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <Checkbox
                  id={type.id}
                  checked={field.value === type.id}
                  onCheckedChange={() => field.onChange(type.id)}
                />
                <Label htmlFor={type.id}>{type.label}</Label>
              </FormItem>
            )}
          />
        ))}
      </div>
    </div>
  );
}