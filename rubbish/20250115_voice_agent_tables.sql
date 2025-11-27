-- Migration: Voice Agent Integration for Retell AI
-- Created: 2025-01-15
-- Purpose: Add tables for voice agent functionality (appointments, task queue, call logs, medical centers)

-- =====================================================
-- 1. MEDICAL CENTERS TABLE (must be created first as it's referenced by appointments)
-- =====================================================
-- Preferred provider network for appointment booking
CREATE TABLE IF NOT EXISTS medical_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Information
  name TEXT NOT NULL,
  trading_name TEXT, -- Alternative name

  -- Contact
  phone_number TEXT NOT NULL,
  fax_number TEXT,
  email TEXT,
  website TEXT,

  -- Address
  address TEXT NOT NULL,
  suburb TEXT NOT NULL,
  state TEXT DEFAULT 'NSW',
  postcode TEXT NOT NULL,

  -- Geolocation
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),

  -- Classification
  center_type TEXT CHECK (center_type IN (
    'gp_clinic',
    'specialist',
    'imaging_center',
    'physiotherapy',
    'hospital',
    'urgent_care'
  )),

  specialty TEXT[], -- e.g., ['orthopedics', 'occupational_health']

  -- Provider Status
  accepts_workers_comp BOOLEAN DEFAULT TRUE,
  preferred_provider BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,

  -- Operational Details
  business_hours JSONB, -- {"monday": "9:00-17:00", "tuesday": "9:00-17:00", ...}
  average_wait_time_days INTEGER,

  -- IVR Navigation (for AI booking)
  has_ivr BOOLEAN DEFAULT FALSE,
  ivr_instructions JSONB, -- {"press_1_for": "appointments", "press_2_for": "billing", ...}
  booking_notes TEXT, -- Special instructions for AI agent

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for medical_centers
CREATE INDEX IF NOT EXISTS idx_medical_centers_suburb ON medical_centers(suburb);
CREATE INDEX IF NOT EXISTS idx_medical_centers_postcode ON medical_centers(postcode);
CREATE INDEX IF NOT EXISTS idx_medical_centers_preferred ON medical_centers(preferred_provider) WHERE preferred_provider = TRUE;
CREATE INDEX IF NOT EXISTS idx_medical_centers_active ON medical_centers(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_medical_centers_specialty ON medical_centers USING GIN (specialty);

-- =====================================================
-- 2. APPOINTMENTS TABLE
-- =====================================================
-- Stores scheduled appointments between workers and medical professionals
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  incident_id INTEGER REFERENCES incidents(incident_id) ON DELETE CASCADE,
  worker_id INTEGER REFERENCES workers(worker_id),
  medical_professional_id INTEGER REFERENCES medical_professionals(doctor_id),
  medical_center_id UUID REFERENCES medical_centers(id),

  -- Appointment Details
  appointment_type TEXT CHECK (appointment_type IN (
    'initial_consult',
    'follow_up',
    'specialist',
    'imaging',
    'physiotherapy',
    'psychology'
  )) NOT NULL,

  scheduled_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,

  -- Status Tracking
  status TEXT CHECK (status IN (
    'scheduled',
    'confirmed',
    'completed',
    'cancelled',
    'no_show',
    'rescheduled'
  )) DEFAULT 'scheduled',

  -- Confirmation Details
  confirmation_method TEXT CHECK (confirmation_method IN (
    'voice_agent',
    'manual',
    'email',
    'sms'
  )),
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT,

  -- Location
  location_address TEXT,
  location_suburb TEXT,
  location_postcode TEXT,

  -- Additional Info
  notes TEXT,
  cancellation_reason TEXT,

  -- Metadata
  created_by TEXT NOT NULL, -- 'ai_agent' or user_id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for appointments
CREATE INDEX IF NOT EXISTS idx_appointments_incident_id ON appointments(incident_id);
CREATE INDEX IF NOT EXISTS idx_appointments_worker_id ON appointments(worker_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_medical_professional ON appointments(medical_professional_id);

-- =====================================================
-- 3. VOICE TASKS TABLE
-- =====================================================
-- Queue for outbound voice agent calls
CREATE TABLE IF NOT EXISTS voice_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  incident_id INTEGER REFERENCES incidents(incident_id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id),

  -- Task Configuration
  task_type TEXT CHECK (task_type IN (
    'booking',           -- Book new appointment
    'check_in',          -- Wellness check
    'reminder',          -- Appointment reminder
    'survey',            -- Post-treatment survey
    'follow_up',         -- General follow-up
    'rescheduling'       -- Reschedule existing appointment
  )) NOT NULL,

  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1=highest, 10=lowest

  -- Scheduling
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  execute_after TIMESTAMPTZ, -- Don't execute before this time
  execute_before TIMESTAMPTZ, -- Don't execute after this time (business hours)

  -- Status
  status TEXT CHECK (status IN (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'cancelled',
    'retrying'
  )) DEFAULT 'pending',

  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_retry_at TIMESTAMPTZ,

  -- Call Details
  target_phone TEXT NOT NULL,
  target_name TEXT,
  retell_call_id TEXT, -- Set when call is initiated

  -- Dynamic Context for Retell Agent
  context_data JSONB, -- Worker name, injury type, medical center details, etc.

  -- Results
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,

  -- Metadata
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for voice_tasks
CREATE INDEX IF NOT EXISTS idx_voice_tasks_incident_id ON voice_tasks(incident_id);
CREATE INDEX IF NOT EXISTS idx_voice_tasks_status ON voice_tasks(status);
CREATE INDEX IF NOT EXISTS idx_voice_tasks_scheduled_at ON voice_tasks(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_voice_tasks_task_type ON voice_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_voice_tasks_priority ON voice_tasks(priority);

-- =====================================================
-- 4. VOICE LOGS TABLE
-- =====================================================
-- Complete record of all voice interactions
CREATE TABLE IF NOT EXISTS voice_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  task_id UUID REFERENCES voice_tasks(id),
  incident_id INTEGER REFERENCES incidents(incident_id),
  appointment_id UUID REFERENCES appointments(id),

  -- Retell Details
  retell_call_id TEXT UNIQUE,
  retell_agent_id TEXT,

  -- Call Metadata
  call_type TEXT CHECK (call_type IN ('inbound', 'outbound')) NOT NULL,
  direction TEXT, -- 'inbound' or 'outbound'
  phone_number TEXT NOT NULL,

  -- Call Results
  duration_seconds INTEGER,
  call_status TEXT, -- 'completed', 'failed', 'busy', 'no-answer', etc.
  disconnect_reason TEXT,

  -- Conversation Data
  transcript TEXT,
  transcript_object JSONB, -- Full structured transcript with timestamps
  recording_url TEXT,

  -- AI Analysis
  sentiment_score DECIMAL(3,2), -- -1.0 (negative) to 1.0 (positive)
  extracted_data JSONB, -- Structured data extracted by LLM (appointment date, symptoms, etc.)
  intent_detected TEXT, -- Primary intent of the call

  -- Quality Metrics
  interruptions_count INTEGER DEFAULT 0,
  user_sentiment TEXT, -- 'positive', 'neutral', 'negative', 'frustrated'
  call_successful BOOLEAN,

  -- Compliance
  recording_consent_obtained BOOLEAN DEFAULT FALSE,
  consent_timestamp TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for voice_logs
CREATE INDEX IF NOT EXISTS idx_voice_logs_task_id ON voice_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_voice_logs_incident_id ON voice_logs(incident_id);
CREATE INDEX IF NOT EXISTS idx_voice_logs_retell_call_id ON voice_logs(retell_call_id);
CREATE INDEX IF NOT EXISTS idx_voice_logs_call_type ON voice_logs(call_type);
CREATE INDEX IF NOT EXISTS idx_voice_logs_created_at ON voice_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_logs_phone_number ON voice_logs(phone_number);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_centers ENABLE ROW LEVEL SECURITY;

-- Appointments RLS Policies
-- Users can only see appointments for incidents they have access to
CREATE POLICY "Users can view appointments for their incidents"
  ON appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.incident_id = appointments.incident_id
      -- Inherits RLS from incidents table
    )
  );

CREATE POLICY "Users can insert appointments for their incidents"
  ON appointments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.incident_id = appointments.incident_id
    )
  );

CREATE POLICY "Users can update appointments for their incidents"
  ON appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.incident_id = appointments.incident_id
    )
  );

-- Voice Tasks RLS Policies
CREATE POLICY "Users can view voice tasks for their incidents"
  ON voice_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.incident_id = voice_tasks.incident_id
    )
  );

CREATE POLICY "Users can insert voice tasks for their incidents"
  ON voice_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.incident_id = voice_tasks.incident_id
    )
  );

CREATE POLICY "System can update all voice tasks"
  ON voice_tasks FOR UPDATE
  USING (true); -- Edge functions use service role key

-- Voice Logs RLS Policies
CREATE POLICY "Users can view voice logs for their incidents"
  ON voice_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.incident_id = voice_logs.incident_id
    )
  );

CREATE POLICY "System can insert voice logs"
  ON voice_logs FOR INSERT
  WITH CHECK (true); -- Edge functions use service role key

-- Medical Centers RLS Policies (public read access)
CREATE POLICY "Anyone can view active medical centers"
  ON medical_centers FOR SELECT
  USING (active = TRUE);

CREATE POLICY "Only super admins can modify medical centers"
  ON medical_centers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.role_id = 1 -- MEND_SUPER_ADMIN
    )
  );

-- =====================================================
-- 6. UPDATED_AT TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_tasks_updated_at
  BEFORE UPDATE ON voice_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_logs_updated_at
  BEFORE UPDATE ON voice_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_centers_updated_at
  BEFORE UPDATE ON medical_centers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to create voice task for appointment booking
CREATE OR REPLACE FUNCTION create_booking_voice_task(
  p_incident_id INTEGER,
  p_target_phone TEXT,
  p_target_name TEXT,
  p_medical_center_id UUID,
  p_priority INTEGER DEFAULT 5
)
RETURNS UUID AS $$
DECLARE
  v_task_id UUID;
  v_context JSONB;
BEGIN
  -- Build context data from incident
  SELECT jsonb_build_object(
    'incident_id', i.incident_id,
    'incident_number', i.incident_number,
    'worker_name', COALESCE(w.given_name, '') || ' ' || COALESCE(w.family_name, ''),
    'injury_type', i.injury_type,
    'injury_description', i.injury_description,
    'date_of_injury', i.date_of_injury,
    'medical_center', jsonb_build_object(
      'name', mc.name,
      'phone', mc.phone_number,
      'address', mc.address || ', ' || mc.suburb || ' ' || mc.postcode
    )
  )
  INTO v_context
  FROM incidents i
  JOIN workers w ON w.worker_id = i.worker_id
  LEFT JOIN medical_centers mc ON mc.id = p_medical_center_id
  WHERE i.incident_id = p_incident_id;

  -- Create task
  INSERT INTO voice_tasks (
    incident_id,
    task_type,
    priority,
    target_phone,
    target_name,
    context_data,
    execute_after,
    execute_before
  )
  VALUES (
    p_incident_id,
    'booking',
    p_priority,
    p_target_phone,
    p_target_name,
    v_context,
    NOW(), -- Execute immediately
    NOW() + INTERVAL '4 hours' -- Expires in 4 hours
  )
  RETURNING id INTO v_task_id;

  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending voice tasks (for task processor)
CREATE OR REPLACE FUNCTION get_pending_voice_tasks(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  task_id UUID,
  incident_id INTEGER,
  task_type TEXT,
  target_phone TEXT,
  target_name TEXT,
  context_data JSONB,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vt.id,
    vt.incident_id,
    vt.task_type,
    vt.target_phone,
    vt.target_name,
    vt.context_data,
    vt.priority
  FROM voice_tasks vt
  WHERE vt.status = 'pending'
    AND vt.retry_count < vt.max_retries
    AND (vt.execute_after IS NULL OR vt.execute_after <= NOW())
    AND (vt.execute_before IS NULL OR vt.execute_before >= NOW())
  ORDER BY vt.priority ASC, vt.scheduled_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. SEED DATA (Sample Medical Centers for NSW)
-- =====================================================

INSERT INTO medical_centers (name, phone_number, address, suburb, state, postcode, center_type, preferred_provider, accepts_workers_comp, specialty, business_hours) VALUES
  ('Sydney CBD Medical Centre', '0290001234', '123 George Street', 'Sydney', 'NSW', '2000', 'gp_clinic', TRUE, TRUE, ARRAY['general_practice', 'occupational_health'], '{"monday": "8:00-18:00", "tuesday": "8:00-18:00", "wednesday": "8:00-18:00", "thursday": "8:00-18:00", "friday": "8:00-18:00"}'),
  ('Parramatta Workers Health Clinic', '0298765432', '45 Church Street', 'Parramatta', 'NSW', '2150', 'gp_clinic', TRUE, TRUE, ARRAY['workers_compensation', 'occupational_health'], '{"monday": "9:00-17:00", "tuesday": "9:00-17:00", "wednesday": "9:00-17:00", "thursday": "9:00-17:00", "friday": "9:00-17:00"}'),
  ('North Shore Physiotherapy', '0299991111', '78 Pacific Highway', 'North Sydney', 'NSW', '2060', 'physiotherapy', TRUE, TRUE, ARRAY['physiotherapy', 'rehabilitation'], '{"monday": "7:00-19:00", "tuesday": "7:00-19:00", "wednesday": "7:00-19:00", "thursday": "7:00-19:00", "friday": "7:00-19:00", "saturday": "8:00-12:00"}'),
  ('Western Sydney Imaging', '0296543210', '234 Main Street', 'Blacktown', 'NSW', '2148', 'imaging_center', TRUE, TRUE, ARRAY['radiology', 'x-ray', 'mri'], '{"monday": "8:00-17:00", "tuesday": "8:00-17:00", "wednesday": "8:00-17:00", "thursday": "8:00-17:00", "friday": "8:00-17:00"}');

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE appointments IS 'Scheduled appointments between injured workers and medical professionals';
COMMENT ON TABLE voice_tasks IS 'Queue for outbound voice agent calls (Retell AI integration)';
COMMENT ON TABLE voice_logs IS 'Complete record of all voice interactions with transcripts and AI analysis';
COMMENT ON TABLE medical_centers IS 'Preferred provider network for appointment booking';
