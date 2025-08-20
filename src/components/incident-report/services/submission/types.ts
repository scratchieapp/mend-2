import type { IncidentFormData } from './validation';

export interface SubmissionResponse {
  success: boolean;
  error?: string;
  incidentId?: number;
}

export type { IncidentFormData };
export type IncidentData = IncidentFormData;