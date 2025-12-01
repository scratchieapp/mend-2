-- =====================================================
-- VOICE AGENT BOOKING INTEGRATION
-- =====================================================
-- This migration adds:
-- 1. Site-Medical Center junction table (priority-based assignment)
-- 2. Medical center "prepared" status columns
-- 3. Worker "prepared" for AI calls status columns
-- 4. RPC functions for call history retrieval

-- =====================================================
-- 1. SITE-MEDICAL CENTER JUNCTION TABLE
-- =====================================================
-- Links sites to their preferred medical centers with priority ordering
CREATE TABLE IF NOT EXISTS site_medical_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id INTEGER NOT NULL REFERENCES sites(site_id) ON DELETE CASCADE,
  medical_center_id UUID NOT NULL REFERENCES medical_centers(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 3), -- 1=primary, 2=backup1, 3=backup2
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  UNIQUE(site_id, medical_center_id),
  UNIQUE(site_id, priority) -- Each site can only have one medical center per priority level
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_site_medical_centers_site ON site_medical_centers(site_id);
CREATE INDEX IF NOT EXISTS idx_site_medical_centers_medical_center ON site_medical_centers(medical_center_id);
CREATE INDEX IF NOT EXISTS idx_site_medical_centers_priority ON site_medical_centers(site_id, priority);

-- RLS for site_medical_centers
ALTER TABLE site_medical_centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_view_site_medical_centers" ON site_medical_centers;
CREATE POLICY "anon_view_site_medical_centers" ON site_medical_centers
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_manage_site_medical_centers" ON site_medical_centers;
CREATE POLICY "anon_manage_site_medical_centers" ON site_medical_centers
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_view_site_medical_centers" ON site_medical_centers;
CREATE POLICY "authenticated_view_site_medical_centers" ON site_medical_centers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_manage_site_medical_centers" ON site_medical_centers;
CREATE POLICY "authenticated_manage_site_medical_centers" ON site_medical_centers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON site_medical_centers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON site_medical_centers TO authenticated;

-- Update trigger for site_medical_centers
CREATE OR REPLACE FUNCTION update_site_medical_centers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS site_medical_centers_updated_at ON site_medical_centers;
CREATE TRIGGER site_medical_centers_updated_at
  BEFORE UPDATE ON site_medical_centers
  FOR EACH ROW
  EXECUTE FUNCTION update_site_medical_centers_timestamp();

-- =====================================================
-- 2. MEDICAL CENTER PREPARATION STATUS COLUMNS
-- =====================================================
-- Add columns to track whether medical center has been briefed on Mend approach
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medical_centers' AND column_name = 'mend_prepared'
  ) THEN
    ALTER TABLE medical_centers ADD COLUMN mend_prepared BOOLEAN DEFAULT false;
    COMMENT ON COLUMN medical_centers.mend_prepared IS 'Has been briefed on Mend approach and ready to receive AI booking calls';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medical_centers' AND column_name = 'mend_prepared_at'
  ) THEN
    ALTER TABLE medical_centers ADD COLUMN mend_prepared_at TIMESTAMPTZ;
    COMMENT ON COLUMN medical_centers.mend_prepared_at IS 'When the medical center was briefed';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medical_centers' AND column_name = 'mend_prepared_by'
  ) THEN
    ALTER TABLE medical_centers ADD COLUMN mend_prepared_by TEXT;
    COMMENT ON COLUMN medical_centers.mend_prepared_by IS 'Who briefed the medical center';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medical_centers' AND column_name = 'mend_prepared_notes'
  ) THEN
    ALTER TABLE medical_centers ADD COLUMN mend_prepared_notes TEXT;
    COMMENT ON COLUMN medical_centers.mend_prepared_notes IS 'Notes from the preparation/briefing call';
  END IF;
END $$;

-- =====================================================
-- 3. WORKER AI CALLS PREPARATION STATUS COLUMNS
-- =====================================================
-- Add columns to track whether worker has been briefed about AI voice calls
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workers' AND column_name = 'ai_calls_prepared'
  ) THEN
    ALTER TABLE workers ADD COLUMN ai_calls_prepared BOOLEAN DEFAULT false;
    COMMENT ON COLUMN workers.ai_calls_prepared IS 'Has been briefed about AI voice agent calls';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workers' AND column_name = 'ai_calls_prepared_at'
  ) THEN
    ALTER TABLE workers ADD COLUMN ai_calls_prepared_at TIMESTAMPTZ;
    COMMENT ON COLUMN workers.ai_calls_prepared_at IS 'When the worker was briefed about AI calls';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workers' AND column_name = 'ai_calls_prepared_by'
  ) THEN
    ALTER TABLE workers ADD COLUMN ai_calls_prepared_by TEXT;
    COMMENT ON COLUMN workers.ai_calls_prepared_by IS 'Who briefed the worker about AI calls';
  END IF;
END $$;

-- =====================================================
-- 4. RPC: Get Medical Centers for Site
-- =====================================================
-- Returns the preferred medical centers for a site, ordered by priority
CREATE OR REPLACE FUNCTION get_site_medical_centers(
  p_site_id INTEGER
) RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', mc.id,
        'name', mc.name,
        'phone_number', mc.phone_number,
        'address', mc.address,
        'suburb', mc.suburb,
        'postcode', mc.postcode,
        'state', mc.state,
        'priority', smc.priority,
        'notes', smc.notes,
        'mend_prepared', COALESCE(mc.mend_prepared, false),
        'mend_prepared_at', mc.mend_prepared_at,
        'mend_prepared_by', mc.mend_prepared_by,
        'active', mc.active
      ) ORDER BY smc.priority ASC
    ), '[]'::jsonb)
    FROM site_medical_centers smc
    JOIN medical_centers mc ON smc.medical_center_id = mc.id
    WHERE smc.site_id = p_site_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_site_medical_centers(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_site_medical_centers(INTEGER) TO authenticated;

-- =====================================================
-- 5. RPC: Set Site Medical Centers
-- =====================================================
-- Upserts the medical centers for a site
CREATE OR REPLACE FUNCTION set_site_medical_centers(
  p_site_id INTEGER,
  p_medical_centers JSONB, -- Array of {medical_center_id, priority, notes}
  p_user_role_id INTEGER DEFAULT NULL,
  p_user_employer_id INTEGER DEFAULT NULL,
  p_created_by TEXT DEFAULT 'system'
) RETURNS JSONB AS $$
DECLARE
  v_site RECORD;
  v_mc JSONB;
BEGIN
  -- Validate site exists
  SELECT * INTO v_site FROM sites WHERE site_id = p_site_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Site not found');
  END IF;
  
  -- Validate permissions (Mend staff can manage any, Builder Admin only their own)
  IF p_user_role_id IS NOT NULL THEN
    IF p_user_role_id NOT IN (1, 2, 3) THEN
      IF p_user_employer_id IS NULL OR p_user_employer_id != v_site.employer_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'You can only manage medical centers for your own sites');
      END IF;
    END IF;
  END IF;
  
  -- Delete existing assignments for this site
  DELETE FROM site_medical_centers WHERE site_id = p_site_id;
  
  -- Insert new assignments
  FOR v_mc IN SELECT * FROM jsonb_array_elements(p_medical_centers)
  LOOP
    INSERT INTO site_medical_centers (site_id, medical_center_id, priority, notes, created_by)
    VALUES (
      p_site_id,
      (v_mc->>'medical_center_id')::UUID,
      (v_mc->>'priority')::INTEGER,
      v_mc->>'notes',
      p_created_by
    )
    ON CONFLICT (site_id, medical_center_id) DO UPDATE SET
      priority = EXCLUDED.priority,
      notes = EXCLUDED.notes,
      updated_at = now();
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'site_id', p_site_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_site_medical_centers(INTEGER, JSONB, INTEGER, INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION set_site_medical_centers(INTEGER, JSONB, INTEGER, INTEGER, TEXT) TO authenticated;

-- =====================================================
-- 6. RPC: Mark Medical Center as Prepared
-- =====================================================
CREATE OR REPLACE FUNCTION mark_medical_center_prepared(
  p_medical_center_id UUID,
  p_prepared_by TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
BEGIN
  UPDATE medical_centers
  SET 
    mend_prepared = true,
    mend_prepared_at = now(),
    mend_prepared_by = p_prepared_by,
    mend_prepared_notes = p_notes
  WHERE id = p_medical_center_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Medical center not found');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'medical_center_id', p_medical_center_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_medical_center_prepared(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION mark_medical_center_prepared(UUID, TEXT, TEXT) TO authenticated;

-- =====================================================
-- 7. RPC: Mark Worker as AI Calls Prepared
-- =====================================================
CREATE OR REPLACE FUNCTION mark_worker_ai_prepared(
  p_worker_id INTEGER,
  p_prepared_by TEXT
) RETURNS JSONB AS $$
BEGIN
  UPDATE workers
  SET 
    ai_calls_prepared = true,
    ai_calls_prepared_at = now(),
    ai_calls_prepared_by = p_prepared_by
  WHERE worker_id = p_worker_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Worker not found');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'worker_id', p_worker_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_worker_ai_prepared(INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION mark_worker_ai_prepared(INTEGER, TEXT) TO authenticated;

-- =====================================================
-- 8. RPC: Get Voice Call History for Incident
-- =====================================================
-- Returns call history with summary for display in incident details
CREATE OR REPLACE FUNCTION get_incident_voice_logs(
  p_incident_id INTEGER
) RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', vl.id,
        'call_id', vl.call_id,
        'task_type', vt.task_type,
        'target_phone', vt.target_phone,
        'target_name', vt.target_name,
        'direction', vl.direction,
        'status', vl.status,
        'duration_seconds', vl.duration_seconds,
        'transcript', vl.transcript,
        'call_summary', vl.call_summary,
        'sentiment', vl.sentiment,
        'recording_url', vl.recording_url,
        'created_at', vl.created_at,
        'ended_at', vl.ended_at,
        'booking_workflow_id', vl.booking_workflow_id,
        'error_message', vl.error_message
      ) ORDER BY vl.created_at DESC
    ), '[]'::jsonb)
    FROM voice_logs vl
    LEFT JOIN voice_tasks vt ON vl.task_id = vt.id
    WHERE vl.incident_id = p_incident_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_incident_voice_logs(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_incident_voice_logs(INTEGER) TO authenticated;

-- =====================================================
-- 9. RPC: Get Voice Call Summary for Incident
-- =====================================================
-- Returns aggregated call stats for quick summary display
CREATE OR REPLACE FUNCTION get_incident_voice_summary(
  p_incident_id INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_total_calls INTEGER;
  v_successful_calls INTEGER;
  v_failed_calls INTEGER;
  v_no_answer_calls INTEGER;
  v_total_duration INTEGER;
  v_last_call RECORD;
BEGIN
  -- Get counts
  SELECT 
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE vl.status = 'completed')::INTEGER,
    COUNT(*) FILTER (WHERE vl.status = 'failed')::INTEGER,
    COUNT(*) FILTER (WHERE vl.status = 'no_answer')::INTEGER,
    COALESCE(SUM(vl.duration_seconds), 0)::INTEGER
  INTO v_total_calls, v_successful_calls, v_failed_calls, v_no_answer_calls, v_total_duration
  FROM voice_logs vl
  WHERE vl.incident_id = p_incident_id;
  
  -- Get last call
  SELECT vl.*, vt.task_type, vt.target_name
  INTO v_last_call
  FROM voice_logs vl
  LEFT JOIN voice_tasks vt ON vl.task_id = vt.id
  WHERE vl.incident_id = p_incident_id
  ORDER BY vl.created_at DESC
  LIMIT 1;
  
  RETURN jsonb_build_object(
    'total_calls', v_total_calls,
    'successful_calls', v_successful_calls,
    'failed_calls', v_failed_calls,
    'no_answer_calls', v_no_answer_calls,
    'total_duration_seconds', v_total_duration,
    'last_call', CASE WHEN v_last_call.id IS NOT NULL THEN jsonb_build_object(
      'id', v_last_call.id,
      'task_type', v_last_call.task_type,
      'target_name', v_last_call.target_name,
      'status', v_last_call.status,
      'duration_seconds', v_last_call.duration_seconds,
      'call_summary', v_last_call.call_summary,
      'created_at', v_last_call.created_at
    ) ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_incident_voice_summary(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_incident_voice_summary(INTEGER) TO authenticated;

-- =====================================================
-- 10. RPC: Get Worker Preparation Status
-- =====================================================
CREATE OR REPLACE FUNCTION get_worker_preparation_status(
  p_worker_id INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_worker RECORD;
BEGIN
  SELECT 
    worker_id,
    given_name,
    family_name,
    ai_calls_prepared,
    ai_calls_prepared_at,
    ai_calls_prepared_by
  INTO v_worker
  FROM workers
  WHERE worker_id = p_worker_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  
  RETURN jsonb_build_object(
    'found', true,
    'worker_id', v_worker.worker_id,
    'name', TRIM(COALESCE(v_worker.given_name, '') || ' ' || COALESCE(v_worker.family_name, '')),
    'ai_calls_prepared', COALESCE(v_worker.ai_calls_prepared, false),
    'ai_calls_prepared_at', v_worker.ai_calls_prepared_at,
    'ai_calls_prepared_by', v_worker.ai_calls_prepared_by
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_worker_preparation_status(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_worker_preparation_status(INTEGER) TO authenticated;

-- =====================================================
-- DONE
-- =====================================================
COMMENT ON TABLE site_medical_centers IS 'Links sites to their preferred medical centers with priority ordering (1=primary, 2-3=backups)';

