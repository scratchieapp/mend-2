-- Add incident_status column to incidents table
-- Date: 2025-08-26
-- Purpose: Add status tracking for incident lifecycle management

-- ============================================
-- 1. ADD INCIDENT STATUS COLUMN
-- ============================================

-- Add the incident_status column with a default value
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS incident_status TEXT DEFAULT 'Open';

-- Add check constraint to ensure valid status values
ALTER TABLE incidents 
ADD CONSTRAINT check_incident_status 
CHECK (incident_status IN (
  'Open',
  'Under Investigation', 
  'Awaiting Documentation',
  'In Review',
  'Closed',
  'Resolved',
  'Reopened',
  'Escalated'
));

-- ============================================
-- 2. UPDATE EXISTING RECORDS BASED ON BUSINESS LOGIC
-- ============================================

-- Set status based on existing data patterns
UPDATE incidents
SET incident_status = CASE
  -- If incident has been responded to and worker returned to work, mark as Resolved
  WHEN date_report_responded IS NOT NULL AND returned_to_work = true THEN 'Resolved'
  
  -- If incident has been responded to but worker hasn't returned, mark as Closed
  WHEN date_report_responded IS NOT NULL AND returned_to_work = false THEN 'Closed'
  
  -- If incident was reported to insurer, it's under investigation
  WHEN reported_to_insurer_date IS NOT NULL THEN 'Under Investigation'
  
  -- If incident has doctor notes or treatment provided, it's in review
  WHEN doctor_notes IS NOT NULL OR treatment_provided IS NOT NULL THEN 'In Review'
  
  -- If incident has been reported to site, it's awaiting documentation
  WHEN date_reported_to_site IS NOT NULL THEN 'Awaiting Documentation'
  
  -- Default to Open for all other cases
  ELSE 'Open'
END
WHERE incident_status IS NULL;

-- ============================================
-- 3. CREATE INDEX FOR PERFORMANCE
-- ============================================

-- Create index on incident_status for faster filtering
CREATE INDEX IF NOT EXISTS idx_incidents_status 
ON incidents(incident_status);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_incidents_employer_status_date 
ON incidents(employer_id, incident_status, date_of_injury DESC);

-- ============================================
-- 4. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to update incident status
CREATE OR REPLACE FUNCTION update_incident_status(
  p_incident_id INTEGER,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_status TEXT;
  v_success BOOLEAN := false;
BEGIN
  -- Get current status
  SELECT incident_status INTO v_old_status
  FROM incidents
  WHERE incident_id = p_incident_id;
  
  -- Update the status
  UPDATE incidents
  SET 
    incident_status = p_new_status,
    updated_at = NOW(),
    case_notes = CASE 
      WHEN p_notes IS NOT NULL 
      THEN COALESCE(case_notes || E'\n', '') || 
           format('[%s] Status changed from %s to %s: %s', 
                  TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI'), 
                  v_old_status, 
                  p_new_status, 
                  p_notes)
      ELSE case_notes
    END
  WHERE incident_id = p_incident_id;
  
  GET DIAGNOSTICS v_success = ROW_COUNT;
  v_success := v_success > 0;
  
  RETURN v_success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get incident statistics by status
CREATE OR REPLACE FUNCTION get_incident_status_statistics(
  p_employer_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH status_counts AS (
    SELECT 
      incident_status,
      COUNT(*) AS status_count
    FROM incidents
    WHERE (p_employer_id IS NULL OR employer_id = p_employer_id)
    GROUP BY incident_status
  ),
  total_count AS (
    SELECT SUM(status_count) AS total
    FROM status_counts
  )
  SELECT 
    sc.incident_status AS status,
    sc.status_count AS count,
    ROUND((sc.status_count::NUMERIC / tc.total * 100), 2) AS percentage
  FROM status_counts sc
  CROSS JOIN total_count tc
  ORDER BY sc.status_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to auto-update status based on business rules
CREATE OR REPLACE FUNCTION auto_update_incident_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-update status based on field changes
  IF NEW.date_report_responded IS NOT NULL AND OLD.date_report_responded IS NULL THEN
    -- Response provided
    IF NEW.returned_to_work = true THEN
      NEW.incident_status := 'Resolved';
    ELSE
      NEW.incident_status := 'Closed';
    END IF;
  ELSIF NEW.reported_to_insurer_date IS NOT NULL AND OLD.reported_to_insurer_date IS NULL THEN
    -- Reported to insurer
    IF NEW.incident_status = 'Open' OR NEW.incident_status = 'Awaiting Documentation' THEN
      NEW.incident_status := 'Under Investigation';
    END IF;
  ELSIF (NEW.doctor_notes IS NOT NULL AND OLD.doctor_notes IS NULL) OR 
        (NEW.treatment_provided IS NOT NULL AND OLD.treatment_provided IS NULL) THEN
    -- Medical information added
    IF NEW.incident_status = 'Open' THEN
      NEW.incident_status := 'In Review';
    END IF;
  ELSIF NEW.date_reported_to_site IS NOT NULL AND OLD.date_reported_to_site IS NULL THEN
    -- Reported to site
    IF NEW.incident_status = 'Open' THEN
      NEW.incident_status := 'Awaiting Documentation';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating status
CREATE TRIGGER trigger_auto_update_incident_status
BEFORE UPDATE ON incidents
FOR EACH ROW
EXECUTE FUNCTION auto_update_incident_status();

-- ============================================
-- 5. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION update_incident_status(INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_incident_status_statistics(INTEGER) TO authenticated;

-- ============================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN incidents.incident_status IS 'Current status of the incident in the workflow lifecycle';
COMMENT ON FUNCTION update_incident_status(INTEGER, TEXT, TEXT) IS 'Updates incident status with optional notes and audit trail';
COMMENT ON FUNCTION get_incident_status_statistics(INTEGER) IS 'Returns statistics of incidents grouped by status';
COMMENT ON FUNCTION auto_update_incident_status() IS 'Automatically updates incident status based on business rules';

-- ============================================
-- 7. CREATE VIEW FOR STATUS DASHBOARD
-- ============================================

CREATE OR REPLACE VIEW v_incident_status_summary AS
SELECT 
  e.employer_id,
  e.employer_name,
  i.incident_status,
  COUNT(i.incident_id) AS incident_count,
  AVG(i.total_days_lost) AS avg_days_lost,
  MAX(i.date_of_injury) AS latest_incident,
  MIN(i.date_of_injury) AS earliest_incident,
  COUNT(CASE WHEN i.fatality = true THEN 1 END) AS fatality_count,
  COUNT(CASE WHEN i.injury_type = 'LTI' THEN 1 END) AS lti_count
FROM incidents i
JOIN employers e ON i.employer_id = e.employer_id
GROUP BY e.employer_id, e.employer_name, i.incident_status;

GRANT SELECT ON v_incident_status_summary TO authenticated;

COMMENT ON VIEW v_incident_status_summary IS 'Summary view of incidents grouped by employer and status';

-- ============================================
-- 8. SAMPLE DATA FOR STATUS TRANSITIONS
-- ============================================

-- Add a status history table for audit trail (optional but recommended)
CREATE TABLE IF NOT EXISTS incident_status_history (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(user_id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incident_status_history_incident ON incident_status_history(incident_id);
CREATE INDEX idx_incident_status_history_date ON incident_status_history(changed_at DESC);

GRANT SELECT, INSERT ON incident_status_history TO authenticated;
GRANT USAGE ON SEQUENCE incident_status_history_id_seq TO authenticated;

COMMENT ON TABLE incident_status_history IS 'Audit trail for incident status changes';

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_incident_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.incident_status IS DISTINCT FROM NEW.incident_status THEN
    INSERT INTO incident_status_history (
      incident_id,
      old_status,
      new_status,
      changed_by,
      change_reason
    ) VALUES (
      NEW.incident_id,
      OLD.incident_status,
      NEW.incident_status,
      NULLIF(current_setting('app.current_user_id', true), '')::UUID,
      'Automatic status update'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log status changes
CREATE TRIGGER trigger_log_incident_status_change
AFTER UPDATE ON incidents
FOR EACH ROW
EXECUTE FUNCTION log_incident_status_change();

-- ============================================
-- 9. ANALYZE TABLE FOR QUERY OPTIMIZER
-- ============================================

ANALYZE incidents;

-- ============================================
-- 10. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Successfully added incident_status column and related functionality to incidents table';
  RAISE NOTICE 'Status values: Open, Under Investigation, Awaiting Documentation, In Review, Closed, Resolved, Reopened, Escalated';
  RAISE NOTICE 'Created helper functions: update_incident_status(), get_incident_status_statistics()';
  RAISE NOTICE 'Created automatic status update trigger based on business rules';
  RAISE NOTICE 'Created incident_status_history table for audit trail';
END $$;