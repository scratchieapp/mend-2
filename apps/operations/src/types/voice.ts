/**
 * TypeScript types for Voice Agent functionality
 * Retell AI integration with Mend platform
 */

// ===================================
// DATABASE TABLE TYPES
// ===================================

export type AppointmentType =
  | 'initial_consult'
  | 'follow_up'
  | 'specialist'
  | 'imaging'
  | 'physiotherapy'
  | 'psychology';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

export type ConfirmationMethod =
  | 'voice_agent'
  | 'manual'
  | 'email'
  | 'sms';

export interface Appointment {
  id: string;
  incident_id: number;
  worker_id: number;
  medical_professional_id: number | null;
  medical_center_id: string | null;
  appointment_type: AppointmentType;
  scheduled_date: string;
  duration_minutes: number;
  status: AppointmentStatus;
  confirmation_method: ConfirmationMethod | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  location_address: string | null;
  location_suburb: string | null;
  location_postcode: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type VoiceTaskType =
  | 'booking'
  | 'check_in'
  | 'reminder'
  | 'survey'
  | 'follow_up'
  | 'rescheduling';

export type VoiceTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

export interface VoiceTask {
  id: string;
  incident_id: number;
  appointment_id: string | null;
  task_type: VoiceTaskType;
  priority: number;
  scheduled_at: string;
  execute_after: string | null;
  execute_before: string | null;
  status: VoiceTaskStatus;
  retry_count: number;
  max_retries: number;
  last_retry_at: string | null;
  target_phone: string;
  target_name: string | null;
  retell_call_id: string | null;
  context_data: Record<string, any> | null;
  completed_at: string | null;
  failure_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CallType = 'inbound' | 'outbound';

export interface VoiceLog {
  id: string;
  task_id: string | null;
  incident_id: number | null;
  appointment_id: string | null;
  retell_call_id: string;
  retell_agent_id: string | null;
  call_type: CallType;
  direction: string | null;
  phone_number: string;
  duration_seconds: number | null;
  call_status: string | null;
  disconnect_reason: string | null;
  transcript: string | null;
  transcript_object: TranscriptSegment[] | null;
  recording_url: string | null;
  sentiment_score: number | null;
  extracted_data: Record<string, any> | null;
  intent_detected: string | null;
  interruptions_count: number;
  user_sentiment: string | null;
  call_successful: boolean | null;
  recording_consent_obtained: boolean;
  consent_timestamp: string | null;
  created_at: string;
  updated_at: string;
}

export interface TranscriptSegment {
  role: 'agent' | 'user';
  content: string;
  timestamp: number;
}

export type MedicalCenterType =
  | 'gp_clinic'
  | 'specialist'
  | 'imaging_center'
  | 'physiotherapy'
  | 'hospital'
  | 'urgent_care';

export interface MedicalCenter {
  id: string;
  name: string;
  trading_name: string | null;
  phone_number: string;
  fax_number: string | null;
  email: string | null;
  website: string | null;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  center_type: MedicalCenterType | null;
  specialty: string[] | null;
  accepts_workers_comp: boolean;
  preferred_provider: boolean;
  active: boolean;
  business_hours: Record<string, string> | null;
  average_wait_time_days: number | null;
  has_ivr: boolean;
  ivr_instructions: Record<string, any> | null;
  booking_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ===================================
// API REQUEST/RESPONSE TYPES
// ===================================

export interface CreateVoiceTaskRequest {
  incident_id: number;
  task_type: VoiceTaskType;
  target_phone?: string;
  medical_center_id?: string;
  appointment_id?: string;
  priority?: number;
  execute_after?: string;
}

export interface CreateVoiceTaskResponse {
  success: boolean;
  task_id?: string;
  call_id?: string;
  call_status?: string;
  error?: string;
}

// ===================================
// UI COMPONENT TYPES
// ===================================

export interface VoiceAgentButtonProps {
  incidentId: number;
  taskType: VoiceTaskType;
  medicalCenterId?: string;
  appointmentId?: string;
  onSuccess?: (taskId: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export interface AppointmentCardProps {
  appointment: Appointment;
  onReschedule?: (appointmentId: string) => void;
  onCancel?: (appointmentId: string) => void;
  showActions?: boolean;
}

export interface VoiceLogViewerProps {
  voiceLog: VoiceLog;
  showTranscript?: boolean;
  showRecording?: boolean;
}

// ===================================
// HOOK RETURN TYPES
// ===================================

export interface UseVoiceAgentReturn {
  createVoiceTask: (request: CreateVoiceTaskRequest) => Promise<CreateVoiceTaskResponse>;
  isCreating: boolean;
  error: Error | null;
}

export interface UseAppointmentsReturn {
  appointments: Appointment[];
  isLoading: boolean;
  error: Error | null;
  createAppointment: (appointment: Partial<Appointment>) => Promise<Appointment>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<Appointment>;
  cancelAppointment: (id: string, reason: string) => Promise<void>;
}

export interface UseVoiceLogsReturn {
  voiceLogs: VoiceLog[];
  isLoading: boolean;
  error: Error | null;
  getLogsByIncident: (incidentId: number) => VoiceLog[];
  getLogsByTask: (taskId: string) => VoiceLog[];
}

// ===================================
// RETELL AI TYPES
// ===================================

export interface RetellAgent {
  agent_id: string;
  agent_name: string;
  voice_id: string;
  voice_model: string;
  llm_websocket_url: string;
  response_engine: {
    type: string;
    [key: string]: any;
  };
}

export interface RetellDynamicVariables {
  worker_name?: string;
  injury_type?: string;
  injury_description?: string;
  date_of_injury?: string;
  incident_number?: string;
  medical_center_name?: string;
  medical_center_address?: string;
  appointment_date?: string;
  appointment_location?: string;
  [key: string]: string | undefined;
}

export interface RetellCallAnalysis {
  call_summary?: string;
  user_sentiment?: 'positive' | 'neutral' | 'negative' | 'frustrated';
  call_successful?: boolean;
  custom_analysis_data?: Record<string, any>;
}

// ===================================
// UTILITY TYPES
// ===================================

export interface VoiceTaskSummary {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  failed: number;
}

export interface AppointmentSummary {
  total: number;
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

// ===================================
// FORM TYPES
// ===================================

export interface CreateAppointmentFormData {
  incident_id: number;
  worker_id: number;
  medical_center_id: string;
  appointment_type: AppointmentType;
  scheduled_date: string;
  notes?: string;
}

export interface RescheduleAppointmentFormData {
  appointment_id: string;
  new_date: string;
  reason: string;
}

export interface CancelAppointmentFormData {
  appointment_id: string;
  cancellation_reason: string;
}

// ===================================
// NOTIFICATION TYPES
// ===================================

export interface VoiceAgentNotification {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  callId?: string;
  taskId?: string;
  timestamp: string;
}

// ===================================
// ANALYTICS TYPES
// ===================================

export interface VoiceAgentAnalytics {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  average_duration_seconds: number;
  average_sentiment_score: number;
  bookings_completed: number;
  check_ins_completed: number;
  reminders_sent: number;
  by_task_type: Record<VoiceTaskType, number>;
  by_status: Record<VoiceTaskStatus, number>;
  by_date: Record<string, number>;
}
