import { z } from 'zod';

// Australian phone validation with normalization
const validateAustralianPhone = (phone: string): boolean => {
  if (!phone) return false;
  
  // Remove all spaces and formatting
  const cleaned = phone.replace(/\s/g, "");
  
  // Convert +61 to 0 format
  const normalized = cleaned.replace(/^\+?61/, "0");
  
  // Check if it matches Australian mobile (04) or landline (02,03,07,08) pattern
  const mobileRegex = /^04\d{8}$/;
  const landlineRegex = /^0[2378]\d{8}$/;
  
  return mobileRegex.test(normalized) || landlineRegex.test(normalized);
};

// Phone validation schema
const phoneValidation = z.string().refine(validateAustralianPhone, {
  message: "Please enter a valid Australian phone number (e.g., 04## ### ### or 02 #### ####)"
});

// Email validation
const emailSchema = z.string().email('Invalid email address');

// Date validation (not in future)
const pastDateSchema = z.string().refine((date) => {
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return inputDate <= today;
}, 'Date cannot be in the future');

// Notification section schema
export const notificationSchema = z.object({
  mend_client: z.string().min(1, 'Client is required'),
  notifying_person_name: z.string().min(2, 'Name must be at least 2 characters'),
  notifying_person_position: z.string().min(2, 'Position is required'),
  notifying_person_telephone: phoneValidation,
});

// Worker details schema
export const workerDetailsSchema = z.object({
  worker_id: z.string().min(1, 'Worker selection is required'),
  worker_name: z.string().optional(),
  worker_email: emailSchema.optional(),
  worker_phone: phoneValidation.optional(),
});

// Employment section schema
export const employmentSchema = z.object({
  employer_name: z.string().min(1, 'Employer name is required'),
  location_site: z.string().min(1, 'Site location is required'),
  supervisor_contact: z.string().min(2, 'Supervisor name is required'),
  supervisor_phone: phoneValidation,
  employment_type: z.enum(['full_time', 'part_time', 'casual', 'contractor'], {
    errorMap: () => ({ message: 'Please select employment type' }),
  }),
});

// Injury details schema
export const injuryDetailsSchema = z.object({
  date_of_injury: pastDateSchema,
  time_of_injury: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  injury_type: z.string().min(1, 'Injury type is required'),
  body_part: z.string().min(1, 'Body part is required'),
  body_side: z.enum(['left', 'right', 'both', 'not_applicable']).optional(),
  injury_description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  witness: z.string().optional(),
  severity: z.enum(['minor', 'moderate', 'serious', 'critical'], {
    errorMap: () => ({ message: 'Please select injury severity' }),
  }),
});

// Treatment details schema
export const treatmentDetailsSchema = z.object({
  type_of_first_aid: z.string().min(1, 'First aid type is required'),
  referred_to: z.enum(['none', 'hospital', 'gp', 'specialist', 'physio']).optional(),
  doctor_details: z.string().optional(),
  treatment_provided: z.string()
    .min(10, 'Treatment description required (min 10 characters)')
    .max(500, 'Treatment description too long (max 500 characters)'),
  return_to_work: z.enum(['yes', 'no', 'unknown']),
  days_lost: z.number().min(0, 'Days lost cannot be negative').optional(),
});

// Actions taken schema
export const actionsTakenSchema = z.object({
  actions_taken: z.array(z.string()).min(1, 'At least one action must be selected'),
  corrective_actions: z.string()
    .min(10, 'Please describe corrective actions (min 10 characters)')
    .max(1000, 'Description too long (max 1000 characters)'),
  reported_to_insurer: z.boolean(),
  insurer_claim_number: z.string().optional(),
});

// Case notes schema
export const caseNotesSchema = z.object({
  case_notes: z.string()
    .max(2000, 'Case notes too long (max 2000 characters)')
    .optional(),
  follow_up_required: z.boolean(),
  follow_up_date: z.string().optional(),
  internal_investigation_required: z.boolean(),
});

// Documents schema
export const documentsSchema = z.object({
  documents: z.array(z.object({
    url: z.string().url('Invalid document URL'),
    name: z.string(),
    type: z.string(),
    size: z.number(),
  })).optional(),
});

// Complete incident report schema (for creating new incidents - strict validation)
export const incidentReportSchema = z.object({
  // Notification
  mend_client: z.string().min(1, 'Client is required'),
  notifying_person_name: z.string().min(2, 'Name must be at least 2 characters'),
  notifying_person_position: z.string().min(2, 'Position is required'),
  notifying_person_telephone: phoneValidation,
  
  // Worker
  worker_id: z.string().min(1, 'Worker selection is required'),
  
  // Employment
  employer_name: z.string().min(1, 'Employer name is required'),
  location_site: z.string().min(1, 'Site location is required'),
  supervisor_contact: z.string().min(2, 'Supervisor name is required'),
  supervisor_phone: phoneValidation,
  employment_type: z.enum(['full_time', 'part_time', 'casual', 'contractor']),
  
  // Injury
  date_of_injury: pastDateSchema,
  time_of_injury: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  injury_type: z.string().min(1, 'Injury type is required'),
  body_part: z.string().min(1, 'Body part is required'),
  body_side: z.enum(['left', 'right', 'both', 'not_applicable']).optional(),
  body_regions: z.array(z.string()).optional().default([]),
  injury_description: z.string().min(10).max(500),
  witness: z.string().optional(),
  
  // Treatment
  type_of_first_aid: z.string().min(1, 'First aid type is required'),
  referred_to: z.enum(['none', 'hospital', 'gp', 'specialist', 'physio']).optional(),
  doctor_details: z.string().optional(),
  
  // Actions
  actions_taken: z.array(z.string()).min(1, 'At least one action required'),
  
  // Notes
  case_notes: z.string().max(2000).optional(),
  
  // Documents
  documents: z.array(z.object({
    url: z.string().url('Invalid document URL'),
    name: z.string(),
    type: z.string(),
    size: z.number(),
  })).optional(),
});

// Relaxed schema for editing existing incidents (allows partial data)
// This schema is intentionally very permissive - incidents may have been created
// via phone calls or other channels with incomplete data, so we allow saving
// whatever partial updates the user makes without requiring all fields.

export const incidentEditSchema = z.object({
  // Notification - all optional, no validation
  mend_client: z.string().optional().nullable().default(''),
  notifying_person_name: z.string().optional().nullable().default(''),
  notifying_person_position: z.string().optional().nullable().default(''),
  notifying_person_telephone: z.string().optional().nullable().default(''),
  
  // Worker - optional (allows incidents without assigned worker)
  worker_id: z.string().optional().nullable().default(''),
  
  // Employment - all optional
  employer_name: z.string().optional().nullable().default(''),
  location_site: z.string().optional().nullable().default(''),
  supervisor_contact: z.string().optional().nullable().default(''),
  supervisor_phone: z.string().optional().nullable().default(''),
  employment_type: z.string().optional().nullable().default('full_time'),
  
  // Injury - all optional
  date_of_injury: z.string().optional().nullable().default(''),
  time_of_injury: z.string().optional().nullable().default(''),
  injury_type: z.string().optional().nullable().default(''),
  body_part: z.string().optional().nullable().default(''),
  body_side: z.string().optional().nullable(),
  body_regions: z.array(z.string()).optional().nullable().default([]),
  injury_description: z.string().optional().nullable().default(''),
  witness: z.string().optional().nullable().default(''),
  
  // Treatment - all optional
  type_of_first_aid: z.string().optional().nullable().default(''),
  referred_to: z.string().optional().nullable().default('none'),
  doctor_details: z.string().optional().nullable().default(''),
  selected_medical_professional: z.string().optional().nullable().default(''),
  
  // Actions - optional (allow empty array)
  actions_taken: z.array(z.string()).optional().nullable().default([]),
  
  // Notes - optional
  case_notes: z.string().optional().nullable().default(''),
  
  // Documents - optional
  documents: z.array(z.any()).optional().nullable().default([]),
});

// Type exports
export type IncidentReportFormData = z.infer<typeof incidentReportSchema>;
export type IncidentEditFormData = z.infer<typeof incidentEditSchema>;
export type NotificationFormData = z.infer<typeof notificationSchema>;
export type WorkerDetailsFormData = z.infer<typeof workerDetailsSchema>;
export type EmploymentFormData = z.infer<typeof employmentSchema>;
export type InjuryDetailsFormData = z.infer<typeof injuryDetailsSchema>;
export type TreatmentDetailsFormData = z.infer<typeof treatmentDetailsSchema>;
export type ActionsTakenFormData = z.infer<typeof actionsTakenSchema>;
export type CaseNotesFormData = z.infer<typeof caseNotesSchema>;
export type DocumentsFormData = z.infer<typeof documentsSchema>;