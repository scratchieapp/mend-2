import React from "react";
import { Control } from "react-hook-form";
import { EmployerField } from "./employment/EmployerField";
import { LocationField } from "./employment/LocationField";
import { SupervisorFields } from "./employment/SupervisorFields";
import { EmploymentTypeField } from "./employment/EmploymentTypeField";

interface EmploymentSectionProps {
  control: Control<any>;
}

export function EmploymentSection({ control }: EmploymentSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">Employment Details</h3>
      <div className="grid grid-cols-1 gap-4">
        <EmployerField control={control} />
        <LocationField control={control} />
        <SupervisorFields control={control} />
        <EmploymentTypeField control={control} />
      </div>
    </div>
  );
}