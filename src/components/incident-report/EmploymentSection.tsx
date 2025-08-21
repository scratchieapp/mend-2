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
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Information about the worker's employment and workplace</p>
      </div>
      <div className="space-y-6">
        <EmployerField control={form.control} />
        <LocationField control={form.control} />
        <SupervisorFields control={form.control} />
        <EmploymentTypeField control={form.control} />
      </div>
    </div>
  );
}