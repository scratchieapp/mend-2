import { Control } from "react-hook-form";
import type { IncidentReportFormData } from "@/lib/validations/incident";

export interface ExpandedInjuryDetailsProps {
  control: Control<IncidentReportFormData>;
  selectedBodyPart: string;
}

export interface MechanismOfInjury {
  moi_code_id: number;
  moi_description: string;
  moi_code_main: string;
  moi_code_sub: string;
}

export interface BodySide {
  body_side_id: number;
  body_side_name: string;
}

export interface BodilyLocation {
  bl_code_id: number;
  bl_description: string;
  bl_code_main?: string;
  bl_code_sub?: string;
}

export interface BodilyLocationResponse {
  bodily_location_codes: BodilyLocation[];
}