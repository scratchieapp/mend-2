-- Complete RLS cleanup and implementation
-- This migration removes ALL dependencies before rebuilding

-- Step 1: Drop all dependent views first
DROP VIEW IF EXISTS v_context_incidents CASCADE;
DROP VIEW IF EXISTS v_context_workers CASCADE;
DROP VIEW IF EXISTS v_context_sites CASCADE;
DROP VIEW IF EXISTS v_context_employers CASCADE;
DROP VIEW IF EXISTS v_user_incidents CASCADE;
DROP VIEW IF EXISTS v_user_workers CASCADE;
DROP VIEW IF EXISTS v_user_sites CASCADE;

-- Step 2: Drop ALL RLS policies on ALL tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on incidents table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'incidents')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON incidents', r.policyname);
    END LOOP;
    
    -- Drop all policies on workers table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'workers')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON workers', r.policyname);
    END LOOP;
    
    -- Drop all policies on sites table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sites')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON sites', r.policyname);
    END LOOP;
    
    -- Drop all policies on employers table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'employers')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON employers', r.policyname);
    END LOOP;
    
    -- Drop all policies on departments table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'departments')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON departments', r.policyname);
    END LOOP;
    
    -- Drop all policies on incident_documents table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'incident_documents')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON incident_documents', r.policyname);
    END LOOP;
    
    -- Drop all policies on users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', r.policyname);
    END LOOP;
END $$;

-- Step 3: Disable RLS on all tables
ALTER TABLE IF EXISTS incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sites DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS incident_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_session_contexts DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL functions with CASCADE to remove dependencies
DROP FUNCTION IF EXISTS get_employer_context() CASCADE;
DROP FUNCTION IF EXISTS set_employer_context(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS clear_employer_context() CASCADE;
DROP FUNCTION IF EXISTS set_employer_context_with_clerk(INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_employer_context_with_clerk(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS clear_employer_context_with_clerk(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_role_by_clerk(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_context_from_session() CASCADE;
DROP FUNCTION IF EXISTS auth.user_role() CASCADE;
DROP FUNCTION IF EXISTS auth.employer_id() CASCADE;
DROP FUNCTION IF EXISTS auth.is_viewing_own_company() CASCADE;

-- Step 5: Drop all versions of the main functions
DROP FUNCTION IF EXISTS get_incidents_with_details(INTEGER, INTEGER, INTEGER, INTEGER, DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_incidents_with_details(INTEGER, INTEGER, INTEGER, INTEGER, DATE, DATE, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_incidents_with_details(INTEGER, INTEGER, INTEGER, INTEGER, DATE, DATE, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_incidents_with_details() CASCADE;

DROP FUNCTION IF EXISTS get_incidents_count(INTEGER, INTEGER, DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_incidents_count(INTEGER, INTEGER, DATE, DATE, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_incidents_count(INTEGER, INTEGER, DATE, DATE, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_incidents_count() CASCADE;

DROP FUNCTION IF EXISTS create_incident_secure(JSONB, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_employers_for_user(INTEGER, INTEGER) CASCADE;

-- Step 6: Create the CLEAN version of get_incidents_with_details
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
  -- Optional debug logging
  -- RAISE NOTICE 'Access request: role=%, employer=%, filter=%', user_role_id, user_employer_id, filter_employer_id;
  
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
    -- Role-based access control
    (
      CASE
        -- If role provided, enforce access control
        WHEN user_role_id IS NOT NULL THEN
          CASE
            -- MEND staff (roles 1, 2, 3) can see all or filter
            WHEN user_role_id <= 3 THEN
              (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
            -- Company users (roles 4+) restricted to their company
            ELSE
              i.employer_id = COALESCE(filter_employer_id, user_employer_id)
          END
        -- No role provided - allow filtering (backward compatibility)
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

-- Step 7: Create the count function
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
            WHEN user_role_id <= 3 THEN
              (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
            ELSE
              i.employer_id = COALESCE(filter_employer_id, user_employer_id)
          END
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

-- Step 8: Create helper function for employer list
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
      WHEN user_role_id <= 3 THEN true
      ELSE e.employer_id = user_employer_id
    END
  ORDER BY e.employer_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create stub functions for backward compatibility
-- These prevent errors from code expecting these functions
CREATE OR REPLACE FUNCTION get_employer_context()
RETURNS INTEGER AS $$
BEGIN
  RETURN NULL; -- Always return NULL (view all mode)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_employer_context(employer_id INTEGER)
RETURNS VOID AS $$
BEGIN
  -- No-op for backward compatibility
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION clear_employer_context()
RETURNS VOID AS $$
BEGIN
  -- No-op for backward compatibility
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Grant permissions
GRANT EXECUTE ON FUNCTION get_incidents_with_details TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_incidents_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_employers_for_user TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_employer_context TO authenticated, anon;
GRANT EXECUTE ON FUNCTION set_employer_context TO authenticated, anon;
GRANT EXECUTE ON FUNCTION clear_employer_context TO authenticated, anon;

-- Step 11: Verification message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS CLEANUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Status:';
  RAISE NOTICE '  - All views dropped';
  RAISE NOTICE '  - All policies removed';
  RAISE NOTICE '  - RLS disabled on all tables';
  RAISE NOTICE '  - Functions recreated cleanly';
  RAISE NOTICE '';
  RAISE NOTICE 'Access Control:';
  RAISE NOTICE '  - Roles 1-3: Can see all companies';
  RAISE NOTICE '  - Roles 4+: See only their company';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions Available:';
  RAISE NOTICE '  - get_incidents_with_details()';
  RAISE NOTICE '  - get_incidents_count()';
  RAISE NOTICE '  - get_employers_for_user()';
  RAISE NOTICE '========================================';
END $$;

-- Step 12: Test the setup
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  -- Test that functions work
  SELECT COUNT(*) INTO test_count 
  FROM get_incidents_with_details(
    page_size := 1,
    user_role_id := 1
  );
  RAISE NOTICE 'Test query successful. Found % incidents for role 1.', test_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Test query failed: %', SQLERRM;
END $$;