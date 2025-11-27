-- CRITICAL FIX: Remove medical_professionals table reference from get_incidents_with_details
-- Date: 2025-08-26
-- Issue: Function is failing with "column mp.medical_professional_id does not exist"
-- Solution: Comment out medical_professionals join since table doesn't exist

-- Drop the existing broken functions
DROP FUNCTION IF EXISTS get_incidents_with_details CASCADE;
DROP FUNCTION IF EXISTS get_incidents_count CASCADE;

-- Create the FIXED function without medical_professionals reference
CREATE OR REPLACE FUNCTION get_incidents_with_details(
  page_size INTEGER DEFAULT 50,
  page_offset INTEGER DEFAULT 0,
  filter_employer_id INTEGER DEFAULT NULL,
  filter_worker_id INTEGER DEFAULT NULL,
  filter_start_date DATE DEFAULT NULL,
  filter_end_date DATE DEFAULT NULL,
  user_role_id INTEGER DEFAULT NULL,
  user_employer_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  incident_id INTEGER,
  incident_number VARCHAR,
  date_of_injury DATE,
  time_of_injury TIME,
  injury_type VARCHAR,
  classification VARCHAR,
  injury_description TEXT,
  fatality BOOLEAN,
  returned_to_work BOOLEAN,
  total_days_lost INTEGER,
  incident_status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  -- Worker details
  worker_id INTEGER,
  worker_first_name VARCHAR,
  worker_last_name VARCHAR,
  worker_full_name VARCHAR,
  worker_employee_number VARCHAR,
  -- Employer details
  employer_id INTEGER,
  employer_name VARCHAR,
  employer_abn VARCHAR,
  -- Medical professional details (nulled out for now)
  medical_professional_id INTEGER,
  medical_professional_name VARCHAR,
  medical_professional_specialty VARCHAR,
  medical_professional_phone VARCHAR,
  -- Site details
  site_id INTEGER,
  site_name VARCHAR,
  site_location VARCHAR,
  -- Department details
  department_id INTEGER,
  department_name VARCHAR,
  -- Document count
  document_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.incident_id,
    i.incident_number,
    i.date_of_injury,
    i.time_of_injury,
    i.injury_type,
    i.classification,
    i.injury_description,
    i.fatality,
    i.returned_to_work,
    i.total_days_lost,
    COALESCE(i.incident_status, 'Open')::VARCHAR AS incident_status,
    i.created_at::TIMESTAMP,
    i.updated_at::TIMESTAMP,
    -- Worker details
    w.worker_id,
    w.given_names::VARCHAR AS worker_first_name,
    w.family_name::VARCHAR AS worker_last_name,
    CONCAT(w.given_names, ' ', w.family_name)::VARCHAR AS worker_full_name,
    w.employee_number::VARCHAR AS worker_employee_number,
    -- Employer details
    e.employer_id,
    e.employer_name,
    e.employer_abn,
    -- Medical professional details - set to NULL since table doesn't exist
    NULL::INTEGER AS medical_professional_id,
    NULL::VARCHAR AS medical_professional_name,
    NULL::VARCHAR AS medical_professional_specialty,
    NULL::VARCHAR AS medical_professional_phone,
    -- Site details
    s.site_id,
    s.site_name,
    s.site_location,
    -- Department details
    d.department_id,
    d.department_name,
    -- Document count
    COALESCE(doc_count.count, 0) AS document_count
  FROM incidents i
  LEFT JOIN workers w ON i.worker_id = w.worker_id
  LEFT JOIN employers e ON i.employer_id = e.employer_id
  -- Medical professionals table doesn't exist - removed join
  LEFT JOIN sites s ON i.site_id = s.site_id
  LEFT JOIN departments d ON i.department_id = d.department_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM incident_documents id
    WHERE id.incident_id = i.incident_id
  ) doc_count ON true
  WHERE 
    -- Apply filters
    (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
    AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
    AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
    -- Apply role-based access control
    AND (
      -- Super Admin (roles 1-3) can see everything
      user_role_id IS NULL OR user_role_id <= 3
      -- Other roles can only see their employer's data
      OR (user_employer_id IS NOT NULL AND i.employer_id = user_employer_id)
    )
  ORDER BY i.date_of_injury DESC, i.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_incidents_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_incidents_with_details TO anon;

-- Recreate the count function (no changes needed but recreating for consistency)
CREATE OR REPLACE FUNCTION get_incidents_count(
  filter_employer_id INTEGER DEFAULT NULL,
  filter_worker_id INTEGER DEFAULT NULL,
  filter_start_date DATE DEFAULT NULL,
  filter_end_date DATE DEFAULT NULL,
  user_role_id INTEGER DEFAULT NULL,
  user_employer_id INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO total_count
  FROM incidents i
  WHERE 
    -- Apply filters
    (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
    AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
    AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
    -- Apply role-based access control
    AND (
      -- Super Admin (roles 1-3) can see everything
      user_role_id IS NULL OR user_role_id <= 3
      -- Other roles can only see their employer's data
      OR (user_employer_id IS NOT NULL AND i.employer_id = user_employer_id)
    );
  
  RETURN total_count;
END;
$$;

-- Grant execute permissions for count function
GRANT EXECUTE ON FUNCTION get_incidents_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_incidents_count TO anon;

-- Add comment
COMMENT ON FUNCTION get_incidents_with_details IS 'FIXED: Retrieves paginated incident data with all related details, respecting role-based access control. Medical professionals table removed.';
COMMENT ON FUNCTION get_incidents_count IS 'Returns the total count of incidents for pagination, respecting role-based access control';