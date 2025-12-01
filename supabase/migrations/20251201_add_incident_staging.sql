-- Migration: Add incident_staging table for voice agent data capture
-- This table temporarily stores incident data from the submit_incident function
-- so it can be retrieved when the call ends

CREATE TABLE IF NOT EXISTS incident_staging (
  call_id TEXT PRIMARY KEY,
  employer_id INTEGER REFERENCES employers(employer_id),
  employer_name TEXT,
  site_id INTEGER REFERENCES sites(site_id),
  site_name TEXT,
  worker_id INTEGER REFERENCES workers(worker_id),
  worker_name TEXT,
  caller_name TEXT,
  caller_role TEXT,
  caller_position TEXT,
  caller_phone TEXT,
  injury_type TEXT,
  injury_description TEXT,
  body_part_injured TEXT,
  body_side TEXT,
  severity TEXT,
  date_of_injury DATE,
  time_of_injury TIME,
  treatment_received TEXT,
  witness_name TEXT,
  caller_was_witness BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ  -- Set when incident is created from this data
);

-- Index for cleanup of old records
CREATE INDEX IF NOT EXISTS idx_incident_staging_created_at 
  ON incident_staging(created_at);

-- Index for lookup by call_id (already primary key, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_incident_staging_call_id 
  ON incident_staging(call_id);

-- Comment documentation
COMMENT ON TABLE incident_staging IS 'Temporary storage for incident data collected by voice agent. Data is moved to incidents table when call ends.';
COMMENT ON COLUMN incident_staging.call_id IS 'Retell call_id - unique identifier for the voice call';
COMMENT ON COLUMN incident_staging.processed_at IS 'Timestamp when this data was used to create an incident';

-- Clean up old staging records (older than 24 hours) - can be called via cron
CREATE OR REPLACE FUNCTION cleanup_incident_staging()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM incident_staging
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_incident_staging() IS 'Removes staging records older than 24 hours. Safe to call periodically.';

