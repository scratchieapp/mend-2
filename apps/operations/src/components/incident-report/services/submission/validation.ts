import { z } from "zod";

export const incidentValidationSchema = z.object({
  // Date and time fields
  date_of_injury: z.string().min(1, "Date of injury is required"),
  time_of_injury: z.string().optional(), // Made optional - not always known
  
  // Basic injury information
  injury_type: z.string().min(1, "Injury type is required"),
  injury_description: z.string().optional(),
  classification: z.string().optional(),
  incident_summary: z.string().optional(),
  
  // Worker information
  worker_name: z.string().optional(),
  injured_worker: z.string().optional(),
  worker_id: z.string().optional(),
  employment_type: z.string().optional(),
  shift_arrangement: z.string().optional(),
  workers_employer: z.string().optional(),
  
  // Employer/Client information (mend_client maps to employer)
  mend_client: z.string().optional(),
  employer_name: z.string().optional(),
  
  // Site/Location information
  site_name: z.string().optional(),
  location: z.string().optional(),
  site_id: z.string().optional(),
  
  // Supervisor information
  supervisor_contact: z.string().optional(),
  supervisor_name: z.string().optional(),
  supervisor_phone: z.string().optional(),
  supervisor_telephone: z.string().optional(),
  
  // Department and medical professional
  department_id: z.string().optional(),
  doctor_id: z.string().optional(),
  doctor_details: z.string().optional(),
  
  // Treatment information
  treatment_provided: z.string().optional(),
  type_of_first_aid: z.string().optional(),
  referred_to: z.string().optional(),
  referral: z.string().optional(),
  
  // Body part and injury codes
  body_part: z.string().optional(),
  body_side: z.string().optional(),
  bodily_location: z.string().optional(),
  mechanism_of_injury: z.string().optional(),
  nature_of_injury: z.string().optional(),
  agency_of_injury: z.string().optional(),
  
  // Claim information
  claim_type: z.string().optional(),
  
  // Actions and notes
  actions_taken: z.string().optional(),
  actions: z.string().optional(),
  case_notes: z.string().optional(),
  
  // Witness information
  witness: z.string().optional(),
  
  // Notifying person fields (required)
  notifying_person_name: z.string().min(1, "Notifying person name is required"),
  notifying_person_position: z.string().min(1, "Notifying person position is required"),
  notifying_person_telephone: z.string().min(1, "Notifying person telephone is required"),
  
  // Work status
  fatality: z.boolean().optional(),
  returned_to_work: z.boolean().optional(),
  total_days_lost: z.string().optional(),
  
  // Reporting dates
  date_reported_to_site: z.string().optional(),
  time_reported_to_site: z.string().optional(),
  date_report_received: z.string().optional(),
  time_report_received: z.string().optional(),
  date_report_responded: z.string().optional(),
  reported_to_insurer_date: z.string().optional(),
  
  // Email notification
  time_date_email_notification: z.string().optional(),
  
  // Documents (for file uploads)
  documents: z.array(z.object({
    file_path: z.string(),
    file_name: z.string(),
    file_size: z.number(),
    file_type: z.string(),
  })).optional(),
});

export type IncidentFormData = z.infer<typeof incidentValidationSchema>;