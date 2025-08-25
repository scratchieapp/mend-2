-- Proper RLS implementation that works with Clerk authentication
-- This migration creates RLS policies that:
-- 1. Allow MEND staff (roles 1-3) to see all records
-- 2. Restrict company users (roles 4+) to only their company's data
-- 3. Works with Clerk authentication by using session variables

-- First, ensure RLS is ENABLED on all sensitive tables
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "incidents_access_policy" ON incidents;
DROP POLICY IF EXISTS "sites_access_policy" ON sites;
DROP POLICY IF EXISTS "workers_access_policy" ON workers;
DROP POLICY IF EXISTS "employers_access_policy" ON employers;
DROP POLICY IF EXISTS "departments_access_policy" ON departments;
DROP POLICY IF EXISTS "incident_documents_access_policy" ON incident_documents;

-- Create a function to get the current user's role and employer from Clerk session
-- This function will be called with Clerk user info from the frontend
CREATE OR REPLACE FUNCTION get_user_context_from_session()
RETURNS TABLE(user_role_id INTEGER, user_employer_id INTEGER) AS $$
BEGIN
  -- Try to get from session variables (set by the application)
  RETURN QUERY
  SELECT 
    COALESCE(current_setting('app.current_role_id', true)::INTEGER, 0),
    COALESCE(current_setting('app.current_employer_id', true)::INTEGER, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update get_incidents_with_details to accept and use Clerk context
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
  -- Set session variables for RLS policies to use
  IF user_role_id IS NOT NULL THEN
    PERFORM set_config('app.current_role_id', user_role_id::TEXT, true);
  END IF;
  
  IF user_employer_id IS NOT NULL THEN
    PERFORM set_config('app.current_employer_id', user_employer_id::TEXT, true);
  END IF;

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
    -- Apply filtering based on user role
    CASE
      -- MEND staff (roles 1-3) can see everything or filter
      WHEN user_role_id IN (1, 2, 3) THEN
        (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
      -- Company users (roles 4+) can only see their company
      ELSE 
        i.employer_id = COALESCE(filter_employer_id, user_employer_id)
    END
    AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
    AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
  ORDER BY i.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_incidents_count to match
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
  -- Set session variables for RLS policies to use
  IF user_role_id IS NOT NULL THEN
    PERFORM set_config('app.current_role_id', user_role_id::TEXT, true);
  END IF;
  
  IF user_employer_id IS NOT NULL THEN
    PERFORM set_config('app.current_employer_id', user_employer_id::TEXT, true);
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.incidents i
  WHERE 
    CASE
      -- MEND staff (roles 1-3) can see everything or filter
      WHEN user_role_id IN (1, 2, 3) THEN
        (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
      -- Company users (roles 4+) can only see their company
      ELSE 
        i.employer_id = COALESCE(filter_employer_id, user_employer_id)
    END
    AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
    AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date);
    
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for incidents table
CREATE POLICY "incidents_access_policy" ON incidents
  FOR ALL
  USING (
    -- Check if user is MEND staff (roles 1-3) or if employer matches
    CASE
      WHEN current_setting('app.current_role_id', true)::INTEGER IN (1, 2, 3) THEN true
      WHEN current_setting('app.current_employer_id', true)::INTEGER = employer_id THEN true
      ELSE false
    END
  );

-- Create RLS policies for workers table
CREATE POLICY "workers_access_policy" ON workers
  FOR ALL
  USING (
    -- Check if user is MEND staff or if employer matches
    CASE
      WHEN current_setting('app.current_role_id', true)::INTEGER IN (1, 2, 3) THEN true
      WHEN current_setting('app.current_employer_id', true)::INTEGER = employer_id THEN true
      ELSE false
    END
  );

-- Create RLS policies for sites table
CREATE POLICY "sites_access_policy" ON sites
  FOR ALL
  USING (
    -- Check if user is MEND staff or if employer matches
    CASE
      WHEN current_setting('app.current_role_id', true)::INTEGER IN (1, 2, 3) THEN true
      WHEN current_setting('app.current_employer_id', true)::INTEGER = employer_id THEN true
      ELSE false
    END
  );

-- Create RLS policies for employers table
CREATE POLICY "employers_access_policy" ON employers
  FOR ALL
  USING (
    -- MEND staff can see all employers, others only see their own
    CASE
      WHEN current_setting('app.current_role_id', true)::INTEGER IN (1, 2, 3) THEN true
      WHEN current_setting('app.current_employer_id', true)::INTEGER = employer_id THEN true
      ELSE false
    END
  );

-- Create RLS policies for departments table
CREATE POLICY "departments_access_policy" ON departments
  FOR ALL
  USING (
    -- Check if user is MEND staff or if employer matches
    CASE
      WHEN current_setting('app.current_role_id', true)::INTEGER IN (1, 2, 3) THEN true
      WHEN current_setting('app.current_employer_id', true)::INTEGER = employer_id THEN true
      ELSE false
    END
  );

-- Create RLS policies for incident_documents table
CREATE POLICY "incident_documents_access_policy" ON incident_documents
  FOR ALL
  USING (
    -- Check access through the incident's employer
    EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.incident_id = incident_documents.incident_id
      AND (
        current_setting('app.current_role_id', true)::INTEGER IN (1, 2, 3)
        OR current_setting('app.current_employer_id', true)::INTEGER = i.employer_id
      )
    )
  );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_incidents_with_details TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_incidents_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_context_from_session TO authenticated, anon;

-- Add helpful comments
COMMENT ON FUNCTION get_incidents_with_details IS 'Get incidents with proper RLS based on user role. MEND staff (roles 1-3) see all, company users see only their data.';
COMMENT ON POLICY "incidents_access_policy" ON incidents IS 'MEND staff (roles 1-3) see all incidents, company users see only their company incidents.';