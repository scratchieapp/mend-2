-- Add medical_professional_id column to incidents table
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS medical_professional_id INTEGER;

-- Add foreign key constraint
ALTER TABLE public.incidents
ADD CONSTRAINT fk_medical_professional
  FOREIGN KEY (medical_professional_id)
  REFERENCES public.medical_professionals(doctor_id)
  ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_incidents_medical_professional_id 
ON public.incidents(medical_professional_id);

-- Create RPC function to search medical professionals by name
CREATE OR REPLACE FUNCTION search_medical_professionals(search_term TEXT)
RETURNS TABLE (
  doctor_id INTEGER,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  specialty TEXT,
  phone_number TEXT,
  email TEXT,
  registration_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.doctor_id,
    mp.first_name,
    mp.last_name,
    mp.first_name || ' ' || mp.last_name AS full_name,
    mp.specialty,
    mp.phone_number,
    mp.email,
    mp.registration_number
  FROM public.medical_professionals mp
  WHERE 
    mp.first_name ILIKE '%' || search_term || '%' 
    OR mp.last_name ILIKE '%' || search_term || '%'
    OR (mp.first_name || ' ' || mp.last_name) ILIKE '%' || search_term || '%'
  ORDER BY mp.last_name, mp.first_name
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_medical_professionals TO authenticated;

-- Create RPC function to get all medical professionals
CREATE OR REPLACE FUNCTION get_all_medical_professionals()
RETURNS TABLE (
  doctor_id INTEGER,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  specialty TEXT,
  phone_number TEXT,
  email TEXT,
  registration_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.doctor_id,
    mp.first_name,
    mp.last_name,
    mp.first_name || ' ' || mp.last_name AS full_name,
    mp.specialty,
    mp.phone_number,
    mp.email,
    mp.registration_number
  FROM public.medical_professionals mp
  ORDER BY mp.last_name, mp.first_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_medical_professionals TO authenticated;

-- Create comprehensive incidents list view function with pagination
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
    SELECT incident_id, COUNT(*) as count 
    FROM public.incident_documents 
    GROUP BY incident_id
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_incidents_with_details TO authenticated;

-- Create a function to get total incident count for pagination
CREATE OR REPLACE FUNCTION get_incidents_count(
  filter_employer_id INTEGER DEFAULT NULL,
  filter_worker_id INTEGER DEFAULT NULL,
  filter_start_date DATE DEFAULT NULL,
  filter_end_date DATE DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  total_count BIGINT;
BEGIN
  SELECT COUNT(*)
  INTO total_count
  FROM public.incidents i
  WHERE 
    (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
    AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
    AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date);
    
  RETURN total_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_incidents_count TO authenticated;

-- Add comment documentation
COMMENT ON COLUMN public.incidents.medical_professional_id IS 'Reference to the medical professional who treated the injury';
COMMENT ON FUNCTION search_medical_professionals IS 'Search medical professionals by first name, last name, or full name';
COMMENT ON FUNCTION get_all_medical_professionals IS 'Get all medical professionals sorted by name';
COMMENT ON FUNCTION get_incidents_with_details IS 'Get paginated list of incidents with all related details';
COMMENT ON FUNCTION get_incidents_count IS 'Get total count of incidents for pagination';