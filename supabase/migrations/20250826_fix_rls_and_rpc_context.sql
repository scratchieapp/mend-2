-- Fix RLS policies and RPC functions to properly use employer context
-- This migration fixes the filtering issue where data wasn't being filtered by selected employer

-- Fix the RLS policies to ALWAYS filter by context when context is set
-- Drop existing policies to recreate with proper logic
DROP POLICY IF EXISTS "Users can view incidents with context" ON incidents;
DROP POLICY IF EXISTS "Users can view sites with context" ON sites;
DROP POLICY IF EXISTS "Users can view workers with context" ON workers;

-- INCIDENTS table policies with PROPER context filtering
CREATE POLICY "Users can view incidents with context" ON incidents
  FOR SELECT
  USING (
    CASE 
      -- Super Admin: If context is set, filter by it. If not set, show all.
      WHEN auth.user_role() = 'mend_super_admin' THEN 
        CASE
          WHEN get_employer_context() IS NOT NULL THEN employer_id = get_employer_context()
          ELSE TRUE -- Show all when no context is set (View All mode)
        END
      -- Other users: Always filter by their context (which defaults to their employer)
      ELSE employer_id = get_employer_context()
    END
  );

-- SITES table policies with PROPER context filtering
CREATE POLICY "Users can view sites with context" ON sites
  FOR SELECT
  USING (
    CASE 
      -- Super Admin: If context is set, filter by it. If not set, show all.
      WHEN auth.user_role() = 'mend_super_admin' THEN 
        CASE
          WHEN get_employer_context() IS NOT NULL THEN employer_id = get_employer_context()
          ELSE TRUE -- Show all when no context is set (View All mode)
        END
      -- Other users: Always filter by their context
      ELSE employer_id = get_employer_context()
    END
  );

-- WORKERS table policies with PROPER context filtering
CREATE POLICY "Users can view workers with context" ON workers
  FOR SELECT
  USING (
    CASE 
      -- Super Admin: If context is set, filter by it. If not set, show all.
      WHEN auth.user_role() = 'mend_super_admin' THEN 
        CASE
          WHEN get_employer_context() IS NOT NULL THEN employer_id = get_employer_context()
          ELSE TRUE -- Show all when no context is set (View All mode)
        END
      -- Other users: Always filter by their context
      ELSE employer_id = get_employer_context()
    END
  );

-- Update the get_incidents_with_details function to use the employer context
DROP FUNCTION IF EXISTS get_incidents_with_details(INTEGER, INTEGER, INTEGER, INTEGER, DATE, DATE);

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
DECLARE
  v_context_employer_id INTEGER;
  v_user_role TEXT;
BEGIN
  -- Get the current user's role
  v_user_role := auth.user_role();
  
  -- Get the employer context (will be NULL for "View All" mode)
  v_context_employer_id := get_employer_context();
  
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
    -- Worker details (using actual column names)
    w.worker_id,
    w.given_name::TEXT AS worker_first_name,
    w.family_name::TEXT AS worker_last_name,
    CASE 
      WHEN w.given_name IS NOT NULL OR w.family_name IS NOT NULL 
      THEN (COALESCE(w.given_name, '') || ' ' || COALESCE(w.family_name, ''))::TEXT
      ELSE NULL::TEXT
    END AS worker_full_name,
    CAST(w.worker_id AS TEXT) AS worker_employee_number,
    -- Employer details (using actual column names)
    e.employer_id,
    e.employer_name::TEXT,
    e.abn::TEXT AS employer_abn,
    -- Medical professional details - safely handle if table doesn't exist or has no data
    i.medical_professional_id,
    NULL::TEXT AS medical_professional_name,
    NULL::TEXT AS medical_professional_specialty,
    NULL::TEXT AS medical_professional_phone,
    -- Site details
    s.site_id,
    s.site_name::TEXT,
    -- Concatenate address fields for site_location
    CASE 
      WHEN s.site_id IS NOT NULL
      THEN TRIM(
        COALESCE(s.street_address || ', ', '') || 
        COALESCE(s.city || ', ', '') || 
        COALESCE(s.state || ' ', '') || 
        COALESCE(s.post_code, '')
      )::TEXT
      ELSE NULL::TEXT
    END AS site_location,
    -- Department details
    d.department_id,
    d.department_name::TEXT,
    -- Document count
    COALESCE(doc_count.doc_count, 0)::BIGINT AS document_count
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
    -- Use context for filtering when Super Admin
    CASE
      WHEN v_user_role = 'mend_super_admin' THEN
        -- If filter_employer_id is provided, use it; otherwise use context
        CASE
          WHEN filter_employer_id IS NOT NULL THEN i.employer_id = filter_employer_id
          WHEN v_context_employer_id IS NOT NULL THEN i.employer_id = v_context_employer_id
          ELSE TRUE -- Show all when no context (View All mode)
        END
      -- Non-super admins always filter by context
      ELSE 
        i.employer_id = COALESCE(filter_employer_id, v_context_employer_id)
    END
    AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
    AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
  ORDER BY i.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_incidents_count function to use context as well
DROP FUNCTION IF EXISTS get_incidents_count(INTEGER, INTEGER, DATE, DATE);

CREATE OR REPLACE FUNCTION get_incidents_count(
  filter_employer_id INTEGER DEFAULT NULL,
  filter_worker_id INTEGER DEFAULT NULL,
  filter_start_date DATE DEFAULT NULL,
  filter_end_date DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_context_employer_id INTEGER;
  v_user_role TEXT;
  v_count INTEGER;
BEGIN
  -- Get the current user's role
  v_user_role := auth.user_role();
  
  -- Get the employer context
  v_context_employer_id := get_employer_context();
  
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.incidents i
  WHERE 
    -- Use context for filtering when Super Admin
    CASE
      WHEN v_user_role = 'mend_super_admin' THEN
        -- If filter_employer_id is provided, use it; otherwise use context
        CASE
          WHEN filter_employer_id IS NOT NULL THEN i.employer_id = filter_employer_id
          WHEN v_context_employer_id IS NOT NULL THEN i.employer_id = v_context_employer_id
          ELSE TRUE -- Show all when no context (View All mode)
        END
      -- Non-super admins always filter by context
      ELSE 
        i.employer_id = COALESCE(filter_employer_id, v_context_employer_id)
    END
    AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
    AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date);
    
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_incidents_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_incidents_count TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_incidents_with_details IS 'Get paginated list of incidents with proper employer context filtering. Super Admins can see all data when no context is set (View All mode) or filtered data when context is set.';
COMMENT ON FUNCTION get_incidents_count IS 'Get count of incidents with proper employer context filtering.';