-- =====================================================
-- MEDICAL BOOKING WORKFLOW STATE MACHINE
-- =====================================================
-- This migration adds support for multi-call medical appointment booking
-- The workflow involves minimum 3 calls:
--   1. Call medical center → Get available times
--   2. Call patient → Confirm preferred time
--   3. Call medical center → Confirm final booking
-- Additional calls may be needed for clarification/rescheduling

-- =====================================================
-- 1. Booking Workflows Table
-- =====================================================
-- Tracks the state machine for each booking attempt
CREATE TABLE IF NOT EXISTS booking_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to incident and worker
  incident_id INTEGER NOT NULL REFERENCES incidents(incident_id),
  worker_id INTEGER REFERENCES workers(worker_id),
  
  -- Medical center and doctor preference
  medical_center_id UUID REFERENCES medical_centers(id),
  preferred_doctor_id INTEGER REFERENCES medical_professionals(doctor_id),
  doctor_preference TEXT NOT NULL DEFAULT 'any_doctor' CHECK (doctor_preference IN ('any_doctor', 'specific_doctor')),
  
  -- Workflow state machine
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN (
    'initiated',              -- Workflow just created
    'calling_medical_center', -- First call to medical center in progress
    'times_collected',        -- Available times received from medical center
    'calling_patient',        -- Calling patient to confirm time
    'patient_confirmed',      -- Patient confirmed a time
    'confirming_booking',     -- Final call to medical center to confirm
    'completed',              -- Booking successfully completed
    'failed',                 -- Booking failed after all retries
    'cancelled'               -- User cancelled the workflow
  )),
  
  -- Collected data from calls
  available_times JSONB DEFAULT '[]'::jsonb,  -- Array of {datetime, doctor_name, notes}
  patient_preferred_time TIMESTAMPTZ,
  patient_preferred_doctor TEXT,
  
  -- Final booking details
  confirmed_datetime TIMESTAMPTZ,
  confirmed_doctor_name TEXT,
  confirmed_location TEXT,
  clinic_email TEXT,
  special_instructions TEXT,
  
  -- Tracking
  current_call_id TEXT,  -- Retell call ID of current active call
  call_count INTEGER DEFAULT 0,
  last_call_type TEXT,  -- 'medical_center', 'patient', 'confirmation'
  failure_reason TEXT,
  
  -- Urgency/priority
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('urgent', 'normal', 'low')),
  requested_by TEXT,  -- User who initiated the booking
  requested_by_user_id UUID REFERENCES users(user_id),
  
  -- Resulting appointment
  appointment_id UUID REFERENCES appointments(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_booking_workflows_incident ON booking_workflows(incident_id);
CREATE INDEX IF NOT EXISTS idx_booking_workflows_status ON booking_workflows(status);
CREATE INDEX IF NOT EXISTS idx_booking_workflows_medical_center ON booking_workflows(medical_center_id);
CREATE INDEX IF NOT EXISTS idx_booking_workflows_current_call ON booking_workflows(current_call_id);

-- =====================================================
-- 2. Add medical_center_id to incidents
-- =====================================================
-- Allows pre-selecting a medical center on the incident
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = 'medical_center_id'
  ) THEN
    ALTER TABLE incidents ADD COLUMN medical_center_id UUID REFERENCES medical_centers(id);
    COMMENT ON COLUMN incidents.medical_center_id IS 'Preferred medical center for this incident worker';
  END IF;
END $$;

-- =====================================================
-- 3. Add preferred_doctor_id to incidents  
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = 'preferred_doctor_id'
  ) THEN
    ALTER TABLE incidents ADD COLUMN preferred_doctor_id INTEGER REFERENCES medical_professionals(doctor_id);
    COMMENT ON COLUMN incidents.preferred_doctor_id IS 'Preferred doctor for this incident worker';
  END IF;
END $$;

-- =====================================================
-- 4. Add booking_workflow_id to voice_tasks
-- =====================================================
-- Links voice tasks to their parent booking workflow
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'voice_tasks' AND column_name = 'booking_workflow_id'
  ) THEN
    ALTER TABLE voice_tasks ADD COLUMN booking_workflow_id UUID REFERENCES booking_workflows(id);
    COMMENT ON COLUMN voice_tasks.booking_workflow_id IS 'Parent booking workflow for multi-call sequences';
  END IF;
END $$;

-- Add new task types for booking workflow
ALTER TABLE voice_tasks DROP CONSTRAINT IF EXISTS voice_tasks_task_type_check;
ALTER TABLE voice_tasks ADD CONSTRAINT voice_tasks_task_type_check 
  CHECK (task_type IN (
    'booking', 'check_in', 'reminder', 'survey', 'follow_up', 'rescheduling',
    'booking_get_times',      -- Call medical center to get available times
    'booking_patient_confirm', -- Call patient to confirm time
    'booking_final_confirm'    -- Call medical center to confirm booking
  ));

-- =====================================================
-- 5. Add booking_workflow_id to voice_logs
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'voice_logs' AND column_name = 'booking_workflow_id'
  ) THEN
    ALTER TABLE voice_logs ADD COLUMN booking_workflow_id UUID REFERENCES booking_workflows(id);
    COMMENT ON COLUMN voice_logs.booking_workflow_id IS 'Parent booking workflow for this call';
  END IF;
END $$;

-- =====================================================
-- 6. RPC: Initiate Booking Workflow
-- =====================================================
-- Called by the UI when user clicks "Book Medical Appointment"
CREATE OR REPLACE FUNCTION initiate_booking_workflow(
  p_incident_id INTEGER,
  p_medical_center_id UUID,
  p_doctor_preference TEXT DEFAULT 'any_doctor',
  p_preferred_doctor_id INTEGER DEFAULT NULL,
  p_urgency TEXT DEFAULT 'normal',
  p_requested_by TEXT DEFAULT 'system',
  p_requested_by_user_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_workflow_id UUID;
  v_incident RECORD;
  v_medical_center RECORD;
  v_worker_id INTEGER;
BEGIN
  -- Get incident details
  SELECT i.*, w.worker_id, w.given_name, w.family_name, w.mobile_number, w.phone_number
  INTO v_incident
  FROM incidents i
  LEFT JOIN workers w ON i.worker_id = w.worker_id
  WHERE i.incident_id = p_incident_id;
  
  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  v_worker_id := v_incident.worker_id;
  
  -- Get medical center details
  SELECT * INTO v_medical_center
  FROM medical_centers
  WHERE id = p_medical_center_id;
  
  IF v_medical_center IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Medical center not found');
  END IF;
  
  -- Check for active booking workflow for this incident
  IF EXISTS (
    SELECT 1 FROM booking_workflows
    WHERE incident_id = p_incident_id
    AND status NOT IN ('completed', 'failed', 'cancelled')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active booking workflow already exists for this incident');
  END IF;
  
  -- Create booking workflow
  INSERT INTO booking_workflows (
    incident_id,
    worker_id,
    medical_center_id,
    preferred_doctor_id,
    doctor_preference,
    status,
    urgency,
    requested_by,
    requested_by_user_id
  ) VALUES (
    p_incident_id,
    v_worker_id,
    p_medical_center_id,
    p_preferred_doctor_id,
    p_doctor_preference,
    'initiated',
    p_urgency,
    p_requested_by,
    p_requested_by_user_id
  ) RETURNING id INTO v_workflow_id;
  
  -- Log activity
  INSERT INTO incident_activity_log (
    incident_id,
    action_type,
    summary,
    details,
    actor_name,
    actor_id,
    metadata
  ) VALUES (
    p_incident_id,
    'voice_agent',
    'Medical booking workflow initiated',
    format('AI booking workflow started for %s at %s', 
           v_incident.given_name || ' ' || v_incident.family_name,
           v_medical_center.name),
    p_requested_by,
    p_requested_by_user_id,
    jsonb_build_object(
      'workflow_id', v_workflow_id,
      'medical_center_id', p_medical_center_id,
      'medical_center_name', v_medical_center.name,
      'doctor_preference', p_doctor_preference
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'workflow_id', v_workflow_id,
    'incident_id', p_incident_id,
    'worker_name', v_incident.given_name || ' ' || v_incident.family_name,
    'worker_phone', COALESCE(v_incident.mobile_number, v_incident.phone_number),
    'medical_center_name', v_medical_center.name,
    'medical_center_phone', v_medical_center.phone_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. RPC: Update Booking Workflow Status
-- =====================================================
CREATE OR REPLACE FUNCTION update_booking_workflow(
  p_workflow_id UUID,
  p_status TEXT DEFAULT NULL,
  p_available_times JSONB DEFAULT NULL,
  p_patient_preferred_time TIMESTAMPTZ DEFAULT NULL,
  p_patient_preferred_doctor TEXT DEFAULT NULL,
  p_confirmed_datetime TIMESTAMPTZ DEFAULT NULL,
  p_confirmed_doctor_name TEXT DEFAULT NULL,
  p_confirmed_location TEXT DEFAULT NULL,
  p_clinic_email TEXT DEFAULT NULL,
  p_special_instructions TEXT DEFAULT NULL,
  p_current_call_id TEXT DEFAULT NULL,
  p_last_call_type TEXT DEFAULT NULL,
  p_failure_reason TEXT DEFAULT NULL,
  p_appointment_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_workflow RECORD;
BEGIN
  -- Get current workflow
  SELECT * INTO v_workflow
  FROM booking_workflows
  WHERE id = p_workflow_id;
  
  IF v_workflow IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workflow not found');
  END IF;
  
  -- Update workflow
  UPDATE booking_workflows SET
    status = COALESCE(p_status, status),
    available_times = COALESCE(p_available_times, available_times),
    patient_preferred_time = COALESCE(p_patient_preferred_time, patient_preferred_time),
    patient_preferred_doctor = COALESCE(p_patient_preferred_doctor, patient_preferred_doctor),
    confirmed_datetime = COALESCE(p_confirmed_datetime, confirmed_datetime),
    confirmed_doctor_name = COALESCE(p_confirmed_doctor_name, confirmed_doctor_name),
    confirmed_location = COALESCE(p_confirmed_location, confirmed_location),
    clinic_email = COALESCE(p_clinic_email, clinic_email),
    special_instructions = COALESCE(p_special_instructions, special_instructions),
    current_call_id = COALESCE(p_current_call_id, current_call_id),
    last_call_type = COALESCE(p_last_call_type, last_call_type),
    failure_reason = COALESCE(p_failure_reason, failure_reason),
    appointment_id = COALESCE(p_appointment_id, appointment_id),
    call_count = CASE WHEN p_current_call_id IS NOT NULL THEN call_count + 1 ELSE call_count END,
    updated_at = now(),
    completed_at = CASE WHEN p_status IN ('completed', 'failed', 'cancelled') THEN now() ELSE completed_at END
  WHERE id = p_workflow_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'workflow_id', p_workflow_id,
    'status', COALESCE(p_status, v_workflow.status)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. RPC: Get Active Booking Workflow
-- =====================================================
CREATE OR REPLACE FUNCTION get_booking_workflow(
  p_incident_id INTEGER DEFAULT NULL,
  p_workflow_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_workflow RECORD;
  v_medical_center RECORD;
BEGIN
  -- Get workflow by ID or incident_id
  IF p_workflow_id IS NOT NULL THEN
    SELECT * INTO v_workflow
    FROM booking_workflows
    WHERE id = p_workflow_id;
  ELSIF p_incident_id IS NOT NULL THEN
    SELECT * INTO v_workflow
    FROM booking_workflows
    WHERE incident_id = p_incident_id
    AND status NOT IN ('completed', 'failed', 'cancelled')
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Either incident_id or workflow_id required');
  END IF;
  
  IF v_workflow IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  
  -- Get medical center details
  SELECT * INTO v_medical_center
  FROM medical_centers
  WHERE id = v_workflow.medical_center_id;
  
  RETURN jsonb_build_object(
    'found', true,
    'workflow', jsonb_build_object(
      'id', v_workflow.id,
      'incident_id', v_workflow.incident_id,
      'worker_id', v_workflow.worker_id,
      'status', v_workflow.status,
      'doctor_preference', v_workflow.doctor_preference,
      'available_times', v_workflow.available_times,
      'patient_preferred_time', v_workflow.patient_preferred_time,
      'patient_preferred_doctor', v_workflow.patient_preferred_doctor,
      'confirmed_datetime', v_workflow.confirmed_datetime,
      'confirmed_doctor_name', v_workflow.confirmed_doctor_name,
      'confirmed_location', v_workflow.confirmed_location,
      'clinic_email', v_workflow.clinic_email,
      'special_instructions', v_workflow.special_instructions,
      'call_count', v_workflow.call_count,
      'last_call_type', v_workflow.last_call_type,
      'urgency', v_workflow.urgency,
      'failure_reason', v_workflow.failure_reason,
      'appointment_id', v_workflow.appointment_id,
      'created_at', v_workflow.created_at,
      'updated_at', v_workflow.updated_at
    ),
    'medical_center', CASE WHEN v_medical_center IS NOT NULL THEN jsonb_build_object(
      'id', v_medical_center.id,
      'name', v_medical_center.name,
      'phone_number', v_medical_center.phone_number,
      'address', v_medical_center.address,
      'suburb', v_medical_center.suburb,
      'postcode', v_medical_center.postcode
    ) ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. RPC: Get Upcoming Appointments for Incident
-- =====================================================
CREATE OR REPLACE FUNCTION get_upcoming_appointments(
  p_incident_id INTEGER
) RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'scheduled_date', a.scheduled_date,
        'appointment_type', a.appointment_type,
        'status', a.status,
        'confirmation_method', a.confirmation_method,
        'confirmed_at', a.confirmed_at,
        'location_address', a.location_address,
        'location_suburb', a.location_suburb,
        'notes', a.notes,
        'medical_center', CASE WHEN mc.id IS NOT NULL THEN jsonb_build_object(
          'id', mc.id,
          'name', mc.name,
          'phone_number', mc.phone_number,
          'address', mc.address
        ) ELSE NULL END,
        'medical_professional', CASE WHEN mp.doctor_id IS NOT NULL THEN jsonb_build_object(
          'id', mp.doctor_id,
          'first_name', mp.first_name,
          'last_name', mp.last_name,
          'specialty', mp.specialty
        ) ELSE NULL END
      ) ORDER BY a.scheduled_date ASC
    ), '[]'::jsonb)
    FROM appointments a
    LEFT JOIN medical_centers mc ON a.medical_center_id = mc.id
    LEFT JOIN medical_professionals mp ON a.medical_professional_id = mp.doctor_id
    WHERE a.incident_id = p_incident_id
    AND a.status IN ('scheduled', 'confirmed')
    AND a.scheduled_date >= now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. Update Trigger for booking_workflows
-- =====================================================
CREATE OR REPLACE FUNCTION update_booking_workflow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_workflows_updated_at ON booking_workflows;
CREATE TRIGGER booking_workflows_updated_at
  BEFORE UPDATE ON booking_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_workflow_timestamp();

-- =====================================================
-- 11. RLS Policies for booking_workflows
-- =====================================================
ALTER TABLE booking_workflows ENABLE ROW LEVEL SECURITY;

-- Allow anon role to read (for Clerk auth compatibility)
DROP POLICY IF EXISTS anon_view_booking_workflows ON booking_workflows;
CREATE POLICY anon_view_booking_workflows ON booking_workflows
  FOR SELECT TO anon USING (true);

-- Allow anon role to insert (via SECURITY DEFINER functions)
DROP POLICY IF EXISTS anon_insert_booking_workflows ON booking_workflows;
CREATE POLICY anon_insert_booking_workflows ON booking_workflows
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anon role to update (via SECURITY DEFINER functions)
DROP POLICY IF EXISTS anon_update_booking_workflows ON booking_workflows;
CREATE POLICY anon_update_booking_workflows ON booking_workflows
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON booking_workflows TO anon;
GRANT SELECT, INSERT, UPDATE ON booking_workflows TO authenticated;

-- =====================================================
-- DONE
-- =====================================================
COMMENT ON TABLE booking_workflows IS 'Tracks multi-call medical booking workflows. Each workflow involves 3+ calls: medical center for times, patient for confirmation, medical center for final booking.';
