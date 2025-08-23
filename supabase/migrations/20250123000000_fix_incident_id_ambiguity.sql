-- Fix ambiguous incident_id reference in get_incidents_with_details function
-- This resolves the error: column reference "incident_id" is ambiguous

CREATE OR REPLACE FUNCTION get_incidents_with_details(
  page_size INTEGER DEFAULT 50,
  page_offset INTEGER DEFAULT 0,
  filter_employer_id INTEGER DEFAULT NULL,
  filter_worker_id INTEGER DEFAULT NULL,
  filter_start_date DATE DEFAULT NULL,
  filter_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  incident_id INTEGER,
  incident_number TEXT,
  date_of_injury DATE,
  time_of_injury TIME,
  injury_type TEXT,
  classification TEXT,
  injury_description TEXT,
  fatality BOOLEAN,
  returned_to_work BOOLEAN,
  total_days_lost INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Worker details
  worker_id INTEGER,
  worker_first_name TEXT,
  worker_last_name TEXT,
  worker_full_name TEXT,
  worker_employee_number TEXT,
  -- Employer details
  employer_id INTEGER,
  employer_name TEXT,
  employer_abn TEXT,
  -- Medical professional details
  medical_professional_id INTEGER,
  medical_professional_name TEXT,
  medical_professional_specialty TEXT,
  medical_professional_phone TEXT,
  -- Site details
  site_id INTEGER,
  site_name TEXT,
  site_location TEXT,
  -- Department details
  department_id INTEGER,
  department_name TEXT,
  -- Document count
  document_count BIGINT
) AS $$
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
    i.created_at,
    i.updated_at,
    -- Worker details
    w.worker_id,
    w.first_name AS worker_first_name,
    w.last_name AS worker_last_name,
    (w.first_name || ' ' || w.last_name) AS worker_full_name,
    w.employee_number AS worker_employee_number,
    -- Employer details
    e.employer_id,
    e.employer_name,
    e.employer_abn,
    -- Medical professional details
    mp.doctor_id AS medical_professional_id,
    (mp.first_name || ' ' || mp.last_name) AS medical_professional_name,
    mp.specialty AS medical_professional_specialty,
    mp.phone_number AS medical_professional_phone,
    -- Site details
    s.site_id,
    s.site_name,
    s.site_location,
    -- Department details
    d.department_id,
    d.department_name,
    -- Document count
    COALESCE(doc_count.count, 0) AS document_count
  FROM public.incidents i
  LEFT JOIN public.workers w ON i.worker_id = w.worker_id
  LEFT JOIN public.employers e ON i.employer_id = e.employer_id
  LEFT JOIN public.medical_professionals mp ON i.medical_professional_id = mp.doctor_id
  LEFT JOIN public.sites s ON i.site_id = s.site_id
  LEFT JOIN public.departments d ON i.department_id = d.department_id
  LEFT JOIN (
    -- FIX: Properly qualify incident_id with table alias
    SELECT id.incident_id, COUNT(*) as count 
    FROM public.incident_documents id
    GROUP BY id.incident_id
  ) doc_count ON i.incident_id = doc_count.incident_id
  WHERE 
    (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
    AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
    AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
  ORDER BY i.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure permissions are set correctly
GRANT EXECUTE ON FUNCTION get_incidents_with_details TO authenticated;

-- Add comment to document the fix
COMMENT ON FUNCTION get_incidents_with_details IS 'Get paginated list of incidents with all related details. Fixed: Resolved incident_id ambiguity in document count subquery.';