-- CRITICAL: Drop ALL versions of the functions first
-- This script handles the "function name is not unique" error

-- Drop ALL possible versions of get_incidents_with_details
DO $$ 
BEGIN
    -- Find and drop all versions of the function
    EXECUTE (
        SELECT string_agg('DROP FUNCTION IF EXISTS ' || oid::regprocedure || ' CASCADE;', E'\n')
        FROM pg_proc
        WHERE proname = 'get_incidents_with_details'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    );
END $$;

-- Drop ALL possible versions of get_incidents_count
DO $$ 
BEGIN
    -- Find and drop all versions of the function
    EXECUTE (
        SELECT string_agg('DROP FUNCTION IF EXISTS ' || oid::regprocedure || ' CASCADE;', E'\n')
        FROM pg_proc
        WHERE proname = 'get_incidents_count'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    );
END $$;

-- Now create the correct version of get_incidents_with_details
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
  -- Medical professional details (NULL placeholders)
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
    COALESCE(i.incident_status, 'Open')::TEXT,
    i.created_at::TIMESTAMP,
    i.updated_at::TIMESTAMP,
    -- Worker details (using correct column names)
    w.worker_id,
    w.given_name::VARCHAR,
    w.family_name::VARCHAR,
    CONCAT(w.given_name, ' ', w.family_name)::VARCHAR,
    NULL::VARCHAR, -- No employee_number column exists
    -- Employer details
    e.employer_id,
    e.employer_name,
    e.employer_abn,
    -- Medical professional details (table doesn't exist)
    NULL::INTEGER,
    NULL::VARCHAR,
    NULL::VARCHAR,
    NULL::VARCHAR,
    -- Site details
    s.site_id,
    s.site_name,
    s.site_location,
    -- Department details
    d.department_id,
    d.department_name,
    -- Document count
    COALESCE(doc_count.count, 0)
  FROM incidents i
  LEFT JOIN workers w ON i.worker_id = w.worker_id
  LEFT JOIN employers e ON i.employer_id = e.employer_id
  LEFT JOIN sites s ON i.site_id = s.site_id
  LEFT JOIN departments d ON i.department_id = d.department_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM incident_documents id
    WHERE id.incident_id = i.incident_id
  ) doc_count ON true
  WHERE 
    (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
    AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
    AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
    AND (
      user_role_id IS NULL OR user_role_id <= 3
      OR (user_employer_id IS NOT NULL AND i.employer_id = user_employer_id)
    )
  ORDER BY i.date_of_injury DESC, i.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;

-- Create the count function
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
    (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
    AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
    AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
    AND (
      user_role_id IS NULL OR user_role_id <= 3
      OR (user_employer_id IS NOT NULL AND i.employer_id = user_employer_id)
    );
  
  RETURN total_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_incidents_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_incidents_with_details TO anon;
GRANT EXECUTE ON FUNCTION get_incidents_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_incidents_count TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully recreated get_incidents_with_details and get_incidents_count functions with correct column names';
END $$;