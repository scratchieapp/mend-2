-- Migration: Add severity column to incidents table
-- This allows tracking of severity level (minor, moderate, severe) from voice agent reports
-- Required for accurate cost estimation

-- Add severity column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = 'severity'
  ) THEN
    ALTER TABLE incidents 
    ADD COLUMN severity TEXT;
  END IF;
END $$;

-- Add a check constraint for valid severity values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'incidents_severity_check'
  ) THEN
    ALTER TABLE incidents 
    ADD CONSTRAINT incidents_severity_check 
    CHECK (severity IS NULL OR severity IN ('minor', 'moderate', 'severe', 'unknown'));
  END IF;
END $$;

-- Add index for severity filtering
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);

-- Add comment
COMMENT ON COLUMN incidents.severity IS 'Severity level reported by caller: minor, moderate, severe. Used for cost estimation.';

