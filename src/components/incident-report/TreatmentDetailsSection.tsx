import { Control } from "react-hook-form";
import { FirstAidSection } from "./treatment/FirstAidSection";
import { MedicalProfessionalSelect } from "./treatment/MedicalProfessionalSelect";
import { DoctorDetails } from "./treatment/DoctorDetails";

interface TreatmentDetailsSectionProps {
  control: Control<any>;
}

export function TreatmentDetailsSection({ control }: TreatmentDetailsSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">Treatment Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FirstAidSection control={control} />
        <div className="col-span-full">
          <MedicalProfessionalSelect control={control} />
          <DoctorDetails control={control} />
        </div>
      </div>
    </div>
  );
}