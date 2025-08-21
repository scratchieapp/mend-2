import { UseFormReturn } from "react-hook-form";
import { WorkerSelector } from "./worker/WorkerSelector";
import { WorkerDetails } from "./worker/WorkerDetails";
import type { IncidentReportFormData } from "@/lib/validations/incident";

interface WorkerDetailsSectionProps {
  form: UseFormReturn<IncidentReportFormData>;
}

export function WorkerDetailsSection({ form }: WorkerDetailsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <WorkerSelector control={form.control} />
        <WorkerDetails control={form.control} />
      </div>
    </div>
  );
}