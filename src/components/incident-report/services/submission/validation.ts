import { z } from "zod";

export const incidentValidationSchema = z.object({
  date_of_injury: z.string().min(1, "Date of injury is required"),
  time_of_injury: z.string().min(1, "Time of injury is required"),
  injury_type: z.string().min(1, "Injury type is required"),
  injury_description: z.string().min(1, "Injury description is required"),
  classification: z.string().optional(),
  worker_id: z.string().optional(),
  employment_type: z.string().optional(),
  site_id: z.string().optional(),
  department_id: z.string().optional(),
  doctor_id: z.string().optional(),
  treatment_provided: z.string().optional(),
  witness: z.string().optional(),
  case_notes: z.string().optional(),
  notifying_person_name: z.string().min(1, "Notifying person name is required"),
  notifying_person_position: z.string().min(1, "Notifying person position is required"),
  notifying_person_telephone: z.string().min(1, "Notifying person telephone is required"),
});

export type IncidentFormData = z.infer<typeof incidentValidationSchema>;