-- Migration: Add archive and soft delete support for incidents
-- Allows incidents to be archived (hidden from default view) or soft deleted

-- Add archive and delete columns
ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- Index for efficient filtering of active incidents
CREATE INDEX IF NOT EXISTS idx_incidents_archived_at ON incidents(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_deleted_at ON incidents(deleted_at) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON COLUMN incidents.archived_at IS 'Timestamp when incident was archived. Archived incidents are hidden from default views but can be restored.';
COMMENT ON COLUMN incidents.archived_by IS 'User who archived the incident';
COMMENT ON COLUMN incidents.deleted_at IS 'Timestamp when incident was soft deleted. Soft deleted incidents are hidden and cannot be restored without admin action.';
COMMENT ON COLUMN incidents.deleted_by IS 'User who deleted the incident';

-- Function to archive an incident
CREATE OR REPLACE FUNCTION archive_incident(
  p_incident_id INTEGER,
  p_user_name TEXT DEFAULT 'System'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE incidents 
  SET 
    archived_at = NOW(),
    archived_by = p_user_name
  WHERE incident_id = p_incident_id
    AND archived_at IS NULL
    AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Function to restore an archived incident
CREATE OR REPLACE FUNCTION restore_incident(
  p_incident_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE incidents 
  SET 
    archived_at = NULL,
    archived_by = NULL
  WHERE incident_id = p_incident_id
    AND archived_at IS NOT NULL
    AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Function to soft delete an incident
CREATE OR REPLACE FUNCTION soft_delete_incident(
  p_incident_id INTEGER,
  p_user_name TEXT DEFAULT 'System'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE incidents 
  SET 
    deleted_at = NOW(),
    deleted_by = p_user_name
  WHERE incident_id = p_incident_id
    AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION archive_incident(INTEGER, TEXT) IS 'Archives an incident, hiding it from default views. Can be restored.';
COMMENT ON FUNCTION restore_incident(INTEGER) IS 'Restores a previously archived incident.';
COMMENT ON FUNCTION soft_delete_incident(INTEGER, TEXT) IS 'Soft deletes an incident. Cannot be restored without admin action.';

