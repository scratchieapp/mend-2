import React from "react";
import { UseFormReturn } from "react-hook-form";
import { EmployerField } from "./employment/EmployerField";
import { LocationField } from "./employment/LocationField";
import { SupervisorFields } from "./employment/SupervisorFields";
import { EmploymentTypeField } from "./employment/EmploymentTypeField";
import type { IncidentReportFormData } from "@/lib/validations/incident";

interface EmploymentSectionProps {
  form: UseFormReturn<IncidentReportFormData>;
}

export function EmploymentSection({ form }: EmploymentSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">Employment Details</h3>
      <div className="grid grid-cols-1 gap-4">
        <EmployerField control={form.control} />
        <LocationField control={form.control} />
        <SupervisorFields control={form.control} />
        <EmploymentTypeField control={form.control} />
      </div>
    </div>
  );
}