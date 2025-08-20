import { UseFormReturn } from "react-hook-form";
import type { IncidentReportFormData } from "@/lib/validations/incident";import { FirstAidSection } from "./treatment/FirstAidSection";
import { MedicalProfessionalSelect } from "./treatment/MedicalProfessionalSelect";
import { DoctorDetails } from "./treatment/DoctorDetails";

interface TreatmentDetailsSectionProps {
  form: UseFormReturn<IncidentReportFormData>;
}

export function TreatmentDetailsSection({ form }: TreatmentDetailsSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">Treatment Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FirstAidSection control={form.control} />
        <div className="col-span-full">
          <MedicalProfessionalSelect control={form.control} />
          <DoctorDetails control={form.control} />
        </div>
      </div>
    </div>
  );
}