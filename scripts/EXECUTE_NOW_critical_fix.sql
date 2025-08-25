-- EXECUTE THIS SQL IMMEDIATELY IN SUPABASE SQL EDITOR TO FIX THE CRITICAL ISSUE
-- This script fixes the broken get_incidents_with_details function

-- Step 1: Drop broken functions
DROP FUNCTION IF EXISTS public.get_incidents_with_details CASCADE;
DROP FUNCTION IF EXISTS public.get_incidents_count CASCADE;

-- Step 2: Create working version without medical_professionals
CREATE OR REPLACE FUNCTION public.get_incidents_with_details(
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
  worker_id INTEGER,
  worker_first_name VARCHAR,
  worker_last_name VARCHAR,
  worker_full_name VARCHAR,
  worker_employee_number VARCHAR,
  employer_id INTEGER,
  employer_name VARCHAR,
  employer_abn VARCHAR,
  medical_professional_id INTEGER,
  medical_professional_name VARCHAR,
  medical_professional_specialty VARCHAR,
  medical_professional_phone VARCHAR,
  site_id INTEGER,
  site_name VARCHAR,
  site_location VARCHAR,
  department_id INTEGER,
  department_name VARCHAR,
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
    COALESCE(i.incident_status, 'Open')::VARCHAR,
    i.created_at::TIMESTAMP,
    i.updated_at::TIMESTAMP,
    w.worker_id,
    w.given_names::VARCHAR,
    w.family_name::VARCHAR,
    CONCAT(w.given_names, ' ', w.family_name)::VARCHAR,
    w.employee_number::VARCHAR,
    e.employer_id,
    e.employer_name,
    e.employer_abn,
    NULL::INTEGER,
    NULL::VARCHAR,
    NULL::VARCHAR,
    NULL::VARCHAR,
    s.site_id,
    s.site_name,
    s.site_location,
    d.department_id,
    d.department_name,
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

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_incidents_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incidents_with_details TO anon;

-- Step 4: Create count function
CREATE OR REPLACE FUNCTION public.get_incidents_count(
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

-- Step 5: Grant permissions for count
GRANT EXECUTE ON FUNCTION public.get_incidents_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incidents_count TO anon;

-- Verify the fix worked
SELECT 'Functions created successfully. Testing...' as status;

-- Test the function
SELECT COUNT(*) as test_count FROM get_incidents_with_details(1, 0);

SELECT 'SUCCESS: Functions fixed and working!' as result;