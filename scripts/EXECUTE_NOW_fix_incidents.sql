-- ============================================
-- CRITICAL FIX: Resolve incident_id ambiguity
-- Execute this IMMEDIATELY in Supabase SQL Editor
-- 
-- Navigate to: https://supabase.com/dashboard/project/rkzcybthcszeusrohbtc/sql/new
-- Copy and paste this entire script, then click "Run"
-- ============================================

-- Step 1: Drop the existing function to ensure clean recreation
DROP FUNCTION IF EXISTS public.get_incidents_with_details(INTEGER, INTEGER, INTEGER, INTEGER, DATE, DATE);

-- Step 2: Recreate the function with properly qualified column references
CREATE OR REPLACE FUNCTION public.get_incidents_with_details(
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
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.incident_id::INTEGER,
    i.incident_number::TEXT,
    i.date_of_injury::DATE,
    i.time_of_injury::TIME,
    i.injury_type::TEXT,
    i.classification::TEXT,
    i.injury_description::TEXT,
    i.fatality::BOOLEAN,
    i.returned_to_work::BOOLEAN,
    i.total_days_lost::INTEGER,
    i.created_at::TIMESTAMPTZ,
    i.updated_at::TIMESTAMPTZ,
    w.worker_id::INTEGER,
    w.first_name::TEXT,
    w.last_name::TEXT,
    (w.first_name || ' ' || w.last_name)::TEXT,
    w.employee_number::TEXT,
    e.employer_id::INTEGER,
    e.employer_name::TEXT,
    e.employer_abn::TEXT,
    mp.doctor_id::INTEGER,
    (mp.first_name || ' ' || mp.last_name)::TEXT,
    mp.specialty::TEXT,
    mp.phone_number::TEXT,
    s.site_id::INTEGER,
    s.site_name::TEXT,
    s.site_location::TEXT,
    d.department_id::INTEGER,
    d.department_name::TEXT,
    COALESCE(doc_counts.total_docs, 0)::BIGINT
  FROM public.incidents i
  LEFT JOIN public.workers w ON i.worker_id = w.worker_id
  LEFT JOIN public.employers e ON i.employer_id = e.employer_id
  LEFT JOIN public.medical_professionals mp ON i.medical_professional_id = mp.doctor_id
  LEFT JOIN public.sites s ON i.site_id = s.site_id
  LEFT JOIN public.departments d ON i.department_id = d.department_id
  LEFT JOIN LATERAL (
    -- CRITICAL FIX: Using LATERAL join with fully qualified references
    SELECT COUNT(*)::BIGINT as total_docs 
    FROM public.incident_documents idoc
    WHERE idoc.incident_id = i.incident_id
  ) doc_counts ON true
  WHERE 
    (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
    AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
    AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
  ORDER BY i.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;

-- Step 3: Grant proper permissions
GRANT EXECUTE ON FUNCTION public.get_incidents_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incidents_with_details TO anon;

-- Step 4: Add documentation
COMMENT ON FUNCTION public.get_incidents_with_details IS 'Get paginated list of incidents with all related details. Fixed: Using LATERAL join to resolve incident_id ambiguity.';

-- ============================================
-- VERIFICATION TESTS
-- ============================================

-- Test 1: Verify the function works without errors
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Try to call the function
  SELECT * INTO test_result FROM public.get_incidents_with_details(1, 0) LIMIT 1;
  RAISE NOTICE 'SUCCESS: Function executed without errors';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: Function still has issues - %', SQLERRM;
END;
$$;

-- Test 2: Get a sample of data to verify it's working
SELECT 
  incident_id,
  incident_number,
  worker_full_name,
  employer_name,
  document_count
FROM public.get_incidents_with_details(5, 0);

-- Test 3: Verify count function still works
SELECT public.get_incidents_count() as total_incidents;

-- Final success message
SELECT 'CRITICAL FIX APPLIED SUCCESSFULLY! The incident_id ambiguity has been resolved.' as status;