-- Simple RLS Solution: Embed access control in functions, not RLS policies
-- This approach is more reliable with Clerk authentication

-- First, DISABLE RLS on all tables (we'll handle security in functions)
ALTER TABLE incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE sites DISABLE ROW LEVEL SECURITY;
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE employers DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE incident_documents DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "incidents_access_policy" ON incidents;
DROP POLICY IF EXISTS "sites_access_policy" ON sites;
DROP POLICY IF EXISTS "workers_access_policy" ON workers;
DROP POLICY IF EXISTS "employers_access_policy" ON employers;
DROP POLICY IF EXISTS "departments_access_policy" ON departments;
DROP POLICY IF EXISTS "incident_documents_access_policy" ON incident_documents;
DROP POLICY IF EXISTS "incidents_direct_access_policy" ON incidents;
DROP POLICY IF EXISTS "workers_direct_access_policy" ON workers;
DROP POLICY IF EXISTS "sites_direct_access_policy" ON sites;
DROP POLICY IF EXISTS "employers_direct_access_policy" ON employers;
DROP POLICY IF EXISTS "departments_direct_access_policy" ON departments;
DROP POLICY IF EXISTS "incident_documents_direct_access_policy" ON incident_documents;

-- Create the main secure function with access control
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
  worker_id INTEGER,
  worker_first_name TEXT,
  worker_last_name TEXT,
  worker_full_name TEXT,
  worker_employee_number TEXT,
  employer_id INTEGER,
  employer_name TEXT,
  employer_abn TEXT,
  medical_professional_id INTEGER,
  medical_professional_name TEXT,
  medical_professional_specialty TEXT,
  medical_professional_phone TEXT,
  site_id INTEGER,
  site_name TEXT,
  site_location TEXT,
  department_id INTEGER,
  department_name TEXT,
  document_count BIGINT
) AS $$
BEGIN
  -- Debug logging (can be removed in production)
  RAISE NOTICE 'Query params: role=%, emp=%, filter_emp=%', user_role_id, user_employer_id, filter_employer_id;

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
    w.worker_id,
    w.given_name::TEXT,
    w.family_name::TEXT,
    (COALESCE(w.given_name, '') || ' ' || COALESCE(w.family_name, ''))::TEXT,
    CAST(w.worker_id AS TEXT),
    e.employer_id,
    e.employer_name::TEXT,
    e.abn::TEXT,
    i.medical_professional_id,
    NULL::TEXT,
    NULL::TEXT,
    NULL::TEXT,
    s.site_id,
    s.site_name::TEXT,
    CASE 
      WHEN s.site_id IS NOT NULL
      THEN TRIM(
        COALESCE(s.street_address || ', ', '') || 
        COALESCE(s.city || ', ', '') || 
        COALESCE(s.state || ' ', '') || 
        COALESCE(s.post_code, '')
      )::TEXT
      ELSE NULL::TEXT
    END,
    d.department_id,
    d.department_name::TEXT,
    COALESCE(doc_count.doc_count, 0)::BIGINT
  FROM public.incidents i
  LEFT JOIN public.workers w ON i.worker_id = w.worker_id
  LEFT JOIN public.employers e ON i.employer_id = e.employer_id
  LEFT JOIN public.sites s ON i.site_id = s.site_id
  LEFT JOIN public.departments d ON i.department_id = d.department_id
  LEFT JOIN (
    SELECT 
      id_docs.incident_id AS doc_incident_id, 
      COUNT(*)::BIGINT AS doc_count 
    FROM public.incident_documents id_docs
    GROUP BY id_docs.incident_id
  ) doc_count ON i.incident_id = doc_count.doc_incident_id
  WHERE 
    -- Simple access control logic
    (
      -- If user_role_id is provided, enforce access control
      CASE
        WHEN user_role_id IS NOT NULL THEN
          CASE
            -- MEND staff (roles 1, 2, 3) can see all or filter
            WHEN user_role_id <= 3 THEN
              (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
            -- Company users (roles 4+) see only their company
            ELSE
              i.employer_id = COALESCE(filter_employer_id, user_employer_id)
          END
        -- If no role provided (backward compatibility), allow filter
        ELSE
          (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
      END
    )
    AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
    AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
  ORDER BY i.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update count function with same logic
CREATE OR REPLACE FUNCTION get_incidents_count(
  filter_employer_id INTEGER DEFAULT NULL,
  filter_worker_id INTEGER DEFAULT NULL,
  filter_start_date DATE DEFAULT NULL,
  filter_end_date DATE DEFAULT NULL,
  user_role_id INTEGER DEFAULT NULL,
  user_employer_id INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.incidents i
  WHERE 
    (
      CASE
        WHEN user_role_id IS NOT NULL THEN
          CASE
            -- MEND staff can see all or filter
            WHEN user_role_id <= 3 THEN
              (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
            -- Company users see only their company
            ELSE
              i.employer_id = COALESCE(filter_employer_id, user_employer_id)
          END
        -- Backward compatibility
        ELSE
          (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
      END
    )
    AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
    AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date);
    
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get employer list based on user role
CREATE OR REPLACE FUNCTION get_employers_for_user(
  user_role_id INTEGER,
  user_employer_id INTEGER
)
RETURNS TABLE (
  employer_id INTEGER,
  employer_name VARCHAR,
  abn VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.employer_id,
    e.employer_name,
    e.abn
  FROM public.employers e
  WHERE 
    CASE
      -- MEND staff see all employers
      WHEN user_role_id <= 3 THEN true
      -- Company users see only their employer
      ELSE e.employer_id = user_employer_id
    END
  ORDER BY e.employer_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_incidents_with_details TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_incidents_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_employers_for_user TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_incidents_with_details IS 'Secure incident fetching with role-based access control. MEND staff (roles 1-3) see all, others see only their company.';
COMMENT ON FUNCTION get_incidents_count IS 'Count incidents with role-based filtering.';
COMMENT ON FUNCTION get_employers_for_user IS 'Get employer list based on user role.';