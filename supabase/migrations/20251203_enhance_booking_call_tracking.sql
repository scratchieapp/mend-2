-- =====================================================
-- ENHANCED BOOKING CALL TRACKING
-- =====================================================
-- This migration adds detailed call tracking to the booking workflow:
-- 1. Track when calls start and end
-- 2. Track retry attempts with proper spacing (30 min)
-- 3. Enforce calling hours (7am-9:30pm)
-- 4. Maintain call history for each attempt

-- =====================================================
-- 1. Add Enhanced Tracking Columns to booking_workflows
-- =====================================================

-- Call timing fields
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_workflows' AND column_name = 'current_call_started_at'
  ) THEN
    ALTER TABLE booking_workflows ADD COLUMN current_call_started_at TIMESTAMPTZ;
    COMMENT ON COLUMN booking_workflows.current_call_started_at IS 'When the current active call started';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_workflows' AND column_name = 'current_call_ended_at'
  ) THEN
    ALTER TABLE booking_workflows ADD COLUMN current_call_ended_at TIMESTAMPTZ;
    COMMENT ON COLUMN booking_workflows.current_call_ended_at IS 'When the current call ended (null if in progress)';
  END IF;
END $$;

-- Patient call retry tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_workflows' AND column_name = 'patient_call_attempts'
  ) THEN
    ALTER TABLE booking_workflows ADD COLUMN patient_call_attempts INTEGER DEFAULT 0;
    COMMENT ON COLUMN booking_workflows.patient_call_attempts IS 'Number of attempts to reach the patient';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_workflows' AND column_name = 'patient_next_retry_at'
  ) THEN
    ALTER TABLE booking_workflows ADD COLUMN patient_next_retry_at TIMESTAMPTZ;
    COMMENT ON COLUMN booking_workflows.patient_next_retry_at IS 'When to retry calling the patient (for scheduled retries)';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_workflows' AND column_name = 'last_call_outcome'
  ) THEN
    ALTER TABLE booking_workflows ADD COLUMN last_call_outcome TEXT;
    COMMENT ON COLUMN booking_workflows.last_call_outcome IS 'Outcome of last call: completed, no_answer, voicemail, busy, failed';
  END IF;
END $$;

-- Add new statuses for better tracking
ALTER TABLE booking_workflows DROP CONSTRAINT IF EXISTS booking_workflows_status_check;
ALTER TABLE booking_workflows ADD CONSTRAINT booking_workflows_status_check 
  CHECK (status IN (
    'initiated',                  -- Workflow just created
    'calling_medical_center',     -- First call to medical center in progress
    'call_in_progress',           -- Generic: a call is actively happening
    'times_collected',            -- Available times received from medical center
    'calling_patient',            -- Calling patient to confirm time
    'awaiting_patient_retry',     -- Patient unreachable, waiting for scheduled retry
    'patient_confirmed',          -- Patient confirmed a time
    'confirming_booking',         -- Final call to medical center to confirm
    'completed',                  -- Booking successfully completed
    'failed',                     -- Booking failed after all retries
    'cancelled',                  -- User cancelled the workflow
    'retrying'                    -- Retrying a call
  ));

-- =====================================================
-- 2. Call History Table
-- =====================================================
-- Tracks each individual call attempt with detailed info
CREATE TABLE IF NOT EXISTS booking_call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES booking_workflows(id) ON DELETE CASCADE,
  
  -- Call sequence (1, 2, 3, etc.)
  call_sequence INTEGER NOT NULL DEFAULT 1,
  
  -- Call target
  call_target TEXT NOT NULL CHECK (call_target IN ('medical_center', 'patient')),
  target_phone TEXT,
  target_name TEXT,
  
  -- Call type
  task_type TEXT NOT NULL CHECK (task_type IN (
    'booking_get_times', 
    'booking_patient_confirm', 
    'booking_final_confirm'
  )),
  
  -- Retell call info
  retell_call_id TEXT,
  voice_task_id UUID REFERENCES voice_tasks(id),
  
  -- Timing
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Outcome
  outcome TEXT CHECK (outcome IN (
    'completed',        -- Call connected and completed
    'no_answer',        -- No one picked up
    'voicemail',        -- Went to voicemail
    'busy',             -- Line busy
    'failed',           -- Technical failure
    'cancelled',        -- Call was cancelled
    'in_progress'       -- Call is currently active
  )),
  
  -- Result data
  call_successful BOOLEAN DEFAULT false,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  failure_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_call_history_workflow ON booking_call_history(workflow_id);
CREATE INDEX IF NOT EXISTS idx_booking_call_history_retell ON booking_call_history(retell_call_id);
CREATE INDEX IF NOT EXISTS idx_booking_call_history_outcome ON booking_call_history(outcome);

-- =====================================================
-- 3. Helper Function: Check Calling Hours
-- =====================================================
-- Returns true if current time is within calling hours (7am-9:30pm)
CREATE OR REPLACE FUNCTION is_within_calling_hours(
  p_timezone TEXT DEFAULT 'Australia/Sydney'
) RETURNS BOOLEAN AS $$
DECLARE
  v_local_time TIME;
  v_local_hour NUMERIC;
BEGIN
  -- Get current local time
  v_local_time := (now() AT TIME ZONE p_timezone)::TIME;
  v_local_hour := EXTRACT(HOUR FROM v_local_time) + EXTRACT(MINUTE FROM v_local_time) / 60.0;
  
  -- Check if between 7:00 AM (7.0) and 9:30 PM (21.5)
  RETURN v_local_hour >= 7.0 AND v_local_hour <= 21.5;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 4. Helper Function: Get Next Valid Calling Time
-- =====================================================
-- Returns the next valid time to make a call (respects calling hours)
CREATE OR REPLACE FUNCTION get_next_valid_call_time(
  p_base_time TIMESTAMPTZ DEFAULT now(),
  p_delay_minutes INTEGER DEFAULT 30,
  p_timezone TEXT DEFAULT 'Australia/Sydney'
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_target_time TIMESTAMPTZ;
  v_local_time TIME;
  v_local_hour NUMERIC;
  v_next_day_7am TIMESTAMPTZ;
BEGIN
  -- Calculate target time with delay
  v_target_time := p_base_time + (p_delay_minutes || ' minutes')::INTERVAL;
  
  -- Get local time at target
  v_local_time := (v_target_time AT TIME ZONE p_timezone)::TIME;
  v_local_hour := EXTRACT(HOUR FROM v_local_time) + EXTRACT(MINUTE FROM v_local_time) / 60.0;
  
  -- If target time is before 7am, move to 7am
  IF v_local_hour < 7.0 THEN
    v_target_time := date_trunc('day', v_target_time AT TIME ZONE p_timezone) AT TIME ZONE p_timezone + INTERVAL '7 hours';
  -- If target time is after 9:30pm, move to next day 7am
  ELSIF v_local_hour > 21.5 THEN
    v_next_day_7am := date_trunc('day', v_target_time AT TIME ZONE p_timezone) AT TIME ZONE p_timezone + INTERVAL '1 day' + INTERVAL '7 hours';
    v_target_time := v_next_day_7am;
  END IF;
  
  RETURN v_target_time;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 5. RPC: Record Call Start
-- =====================================================
CREATE OR REPLACE FUNCTION record_booking_call_start(
  p_workflow_id UUID,
  p_retell_call_id TEXT,
  p_call_target TEXT,
  p_target_phone TEXT,
  p_target_name TEXT,
  p_task_type TEXT,
  p_voice_task_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_call_history_id UUID;
  v_call_sequence INTEGER;
BEGIN
  -- Get next call sequence
  SELECT COALESCE(MAX(call_sequence), 0) + 1 INTO v_call_sequence
  FROM booking_call_history
  WHERE workflow_id = p_workflow_id;
  
  -- Insert call history record
  INSERT INTO booking_call_history (
    workflow_id,
    call_sequence,
    call_target,
    target_phone,
    target_name,
    task_type,
    retell_call_id,
    voice_task_id,
    scheduled_at,
    started_at,
    outcome
  ) VALUES (
    p_workflow_id,
    v_call_sequence,
    p_call_target,
    p_target_phone,
    p_target_name,
    p_task_type,
    p_retell_call_id,
    p_voice_task_id,
    now(),
    now(),
    'in_progress'
  ) RETURNING id INTO v_call_history_id;
  
  -- Update workflow with current call info
  UPDATE booking_workflows SET
    current_call_id = p_retell_call_id,
    current_call_started_at = now(),
    current_call_ended_at = NULL,
    last_call_type = p_call_target,
    updated_at = now()
  WHERE id = p_workflow_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'call_history_id', v_call_history_id,
    'call_sequence', v_call_sequence
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. RPC: Record Call End
-- =====================================================
CREATE OR REPLACE FUNCTION record_booking_call_end(
  p_workflow_id UUID,
  p_retell_call_id TEXT,
  p_outcome TEXT,
  p_call_successful BOOLEAN DEFAULT false,
  p_extracted_data JSONB DEFAULT '{}'::jsonb,
  p_failure_reason TEXT DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_call_record RECORD;
  v_is_patient_call BOOLEAN;
  v_patient_attempts INTEGER;
BEGIN
  -- Update call history record
  UPDATE booking_call_history SET
    ended_at = now(),
    outcome = p_outcome,
    call_successful = p_call_successful,
    extracted_data = p_extracted_data,
    failure_reason = p_failure_reason,
    duration_seconds = COALESCE(p_duration_seconds, EXTRACT(EPOCH FROM (now() - started_at))::INTEGER),
    updated_at = now()
  WHERE retell_call_id = p_retell_call_id
  RETURNING * INTO v_call_record;
  
  -- Check if this was a patient call
  v_is_patient_call := v_call_record.call_target = 'patient';
  
  -- Update workflow
  UPDATE booking_workflows SET
    current_call_ended_at = now(),
    last_call_outcome = p_outcome,
    patient_call_attempts = CASE 
      WHEN v_is_patient_call THEN patient_call_attempts + 1 
      ELSE patient_call_attempts 
    END,
    updated_at = now()
  WHERE id = p_workflow_id
  RETURNING patient_call_attempts INTO v_patient_attempts;
  
  RETURN jsonb_build_object(
    'success', true,
    'call_history_id', v_call_record.id,
    'is_patient_call', v_is_patient_call,
    'patient_attempts', v_patient_attempts,
    'call_target', v_call_record.call_target,
    'outcome', p_outcome
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. RPC: Schedule Patient Retry
-- =====================================================
-- Called when patient call fails, schedules retry respecting calling hours
CREATE OR REPLACE FUNCTION schedule_patient_call_retry(
  p_workflow_id UUID,
  p_delay_minutes INTEGER DEFAULT 30,
  p_failure_reason TEXT DEFAULT 'No answer'
) RETURNS JSONB AS $$
DECLARE
  v_workflow RECORD;
  v_next_retry_time TIMESTAMPTZ;
  v_max_attempts CONSTANT INTEGER := 3;
BEGIN
  -- Get current workflow
  SELECT * INTO v_workflow
  FROM booking_workflows
  WHERE id = p_workflow_id;
  
  IF v_workflow IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workflow not found');
  END IF;
  
  -- Check if max attempts reached
  IF v_workflow.patient_call_attempts >= v_max_attempts THEN
    -- Mark as failed
    UPDATE booking_workflows SET
      status = 'failed',
      failure_reason = format('Unable to reach patient after %s attempts. Last attempt: %s', v_max_attempts, p_failure_reason),
      updated_at = now()
    WHERE id = p_workflow_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'max_attempts_reached', true,
      'attempts', v_workflow.patient_call_attempts,
      'status', 'failed'
    );
  END IF;
  
  -- Calculate next valid retry time
  v_next_retry_time := get_next_valid_call_time(now(), p_delay_minutes, 'Australia/Sydney');
  
  -- Update workflow with retry schedule
  UPDATE booking_workflows SET
    status = 'awaiting_patient_retry',
    patient_next_retry_at = v_next_retry_time,
    failure_reason = format('Attempt %s: %s. Retry scheduled for %s', 
                            v_workflow.patient_call_attempts + 1, 
                            p_failure_reason,
                            to_char(v_next_retry_time AT TIME ZONE 'Australia/Sydney', 'HH12:MI AM')),
    updated_at = now()
  WHERE id = p_workflow_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'max_attempts_reached', false,
    'current_attempts', v_workflow.patient_call_attempts,
    'next_retry_at', v_next_retry_time,
    'status', 'awaiting_patient_retry'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. RPC: Get Workflows Ready for Patient Retry
-- =====================================================
-- Used by a cron job to find workflows ready for patient retry
CREATE OR REPLACE FUNCTION get_workflows_pending_patient_retry()
RETURNS SETOF booking_workflows AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM booking_workflows
  WHERE status = 'awaiting_patient_retry'
    AND patient_next_retry_at <= now()
    AND is_within_calling_hours('Australia/Sydney');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. RPC: Get Booking Workflow with Call History
-- =====================================================
CREATE OR REPLACE FUNCTION get_booking_workflow_with_history(
  p_workflow_id UUID DEFAULT NULL,
  p_incident_id INTEGER DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_workflow RECORD;
  v_medical_center RECORD;
  v_call_history JSONB;
BEGIN
  -- Get workflow
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
  
  -- Get medical center
  SELECT * INTO v_medical_center
  FROM medical_centers
  WHERE id = v_workflow.medical_center_id;
  
  -- Get call history
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ch.id,
      'call_sequence', ch.call_sequence,
      'call_target', ch.call_target,
      'target_name', ch.target_name,
      'task_type', ch.task_type,
      'started_at', ch.started_at,
      'ended_at', ch.ended_at,
      'duration_seconds', ch.duration_seconds,
      'outcome', ch.outcome,
      'call_successful', ch.call_successful
    ) ORDER BY ch.call_sequence ASC
  ), '[]'::jsonb)
  INTO v_call_history
  FROM booking_call_history ch
  WHERE ch.workflow_id = v_workflow.id;
  
  RETURN jsonb_build_object(
    'found', true,
    'workflow', jsonb_build_object(
      'id', v_workflow.id,
      'incident_id', v_workflow.incident_id,
      'status', v_workflow.status,
      'call_count', v_workflow.call_count,
      'current_call_id', v_workflow.current_call_id,
      'current_call_started_at', v_workflow.current_call_started_at,
      'current_call_ended_at', v_workflow.current_call_ended_at,
      'last_call_type', v_workflow.last_call_type,
      'last_call_outcome', v_workflow.last_call_outcome,
      'patient_call_attempts', v_workflow.patient_call_attempts,
      'patient_next_retry_at', v_workflow.patient_next_retry_at,
      'available_times', v_workflow.available_times,
      'patient_preferred_time', v_workflow.patient_preferred_time,
      'confirmed_datetime', v_workflow.confirmed_datetime,
      'confirmed_doctor_name', v_workflow.confirmed_doctor_name,
      'failure_reason', v_workflow.failure_reason,
      'retry_attempt', v_workflow.retry_attempt,
      'medical_center_attempt', v_workflow.medical_center_attempt,
      'created_at', v_workflow.created_at,
      'updated_at', v_workflow.updated_at
    ),
    'medical_center', CASE WHEN v_medical_center IS NOT NULL THEN jsonb_build_object(
      'id', v_medical_center.id,
      'name', v_medical_center.name,
      'phone_number', v_medical_center.phone_number
    ) ELSE NULL END,
    'call_history', v_call_history,
    'is_call_active', (v_workflow.current_call_started_at IS NOT NULL AND v_workflow.current_call_ended_at IS NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. RLS Policies for booking_call_history
-- =====================================================
ALTER TABLE booking_call_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_view_booking_call_history ON booking_call_history;
CREATE POLICY anon_view_booking_call_history ON booking_call_history
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_insert_booking_call_history ON booking_call_history;
CREATE POLICY anon_insert_booking_call_history ON booking_call_history
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS anon_update_booking_call_history ON booking_call_history;
CREATE POLICY anon_update_booking_call_history ON booking_call_history
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON booking_call_history TO anon;
GRANT SELECT, INSERT, UPDATE ON booking_call_history TO authenticated;

-- =====================================================
-- DONE
-- =====================================================
COMMENT ON TABLE booking_call_history IS 'Detailed history of each call attempt in a booking workflow. Tracks start/end times, outcomes, and extracted data.';

