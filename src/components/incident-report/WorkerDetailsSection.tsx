import { Control } from "react-hook-form";
import { WorkerSelector } from "./worker/WorkerSelector";
import { WorkerDetails } from "./worker/WorkerDetails";

interface WorkerDetailsSectionProps {
  control: Control<any>;
}

export function WorkerDetailsSection({ control }: WorkerDetailsSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">Worker Details</h3>
      <div className="grid grid-cols-1 gap-4">
        <WorkerSelector control={control} />
        <WorkerDetails control={control} />
      </div>
    </div>
  );
}