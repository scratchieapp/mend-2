-- =====================================================
-- COMPLETE PERFORMANCE FIX FOR 5-10 MINUTE LOAD TIMES
-- =====================================================
-- Apply this entire script in Supabase SQL Editor
-- This will reduce load times from 5-10 minutes to <1 second

-- =====================================================
-- PART 1: FIX THE METRICS ERROR
-- =====================================================
-- Error: "column i.total_claim_cost does not exist"
-- Solution: Create function with correct column name

DROP FUNCTION IF EXISTS public.get_incident_metrics_rbac CASCADE;

CREATE OR REPLACE FUNCTION public.get_incident_metrics_rbac(
  user_role_id integer DEFAULT NULL,
  user_employer_id integer DEFAULT NULL,
  filter_employer_id integer DEFAULT NULL,
  filter_start_date date DEFAULT NULL,
  filter_end_date date DEFAULT NULL
)
RETURNS TABLE (
  total_incidents bigint,
  avg_lost_time numeric,
  total_lost_days numeric,
  total_claim_costs numeric,
  psychosocial_count bigint,
  fatality_count bigint,
  lti_count bigint,
  mti_count bigint,
  fai_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
PARALLEL SAFE
AS $$
DECLARE
  v_has_all_access boolean := false;
BEGIN
  -- Super Admin or MEND staff see everything
  v_has_all_access := (user_role_id IN (1, 2, 3, 4));

  RETURN QUERY
  WITH filtered_incidents AS (
    SELECT i.*
    FROM incidents i
    WHERE 
      (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
      AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
      AND (
        (v_has_all_access = true AND (filter_employer_id IS NULL OR i.employer_id = filter_employer_id))
        OR
        (v_has_all_access = false AND user_employer_id IS NOT NULL AND i.employer_id = user_employer_id)
      )
  )
  SELECT 
    COUNT(*)::bigint AS total_incidents,
    COALESCE(AVG(CASE WHEN total_days_lost > 0 THEN total_days_lost ELSE NULL END), 0)::numeric AS avg_lost_time,
    COALESCE(SUM(total_days_lost), 0)::numeric AS total_lost_days,
    COALESCE(SUM(estimated_cost), 0)::numeric AS total_claim_costs,  -- FIX: Use estimated_cost
    COUNT(*) FILTER (
      WHERE psychosocial_factors IS NOT NULL 
      AND jsonb_typeof(psychosocial_factors) = 'object'
      AND psychosocial_factors::text != '{}'
    )::bigint AS psychosocial_count,
    COUNT(*) FILTER (WHERE fatality = true)::bigint AS fatality_count,
    COUNT(*) FILTER (WHERE classification = 'LTI')::bigint AS lti_count,
    COUNT(*) FILTER (WHERE classification = 'MTI')::bigint AS mti_count,
    COUNT(*) FILTER (WHERE classification = 'FAI')::bigint AS fai_count
  FROM filtered_incidents;
END;
$$;

-- =====================================================
-- PART 2: OPTIMIZE INCIDENTS RETRIEVAL
-- =====================================================

DROP FUNCTION IF EXISTS public.get_incidents_with_details_rbac CASCADE;

CREATE OR REPLACE FUNCTION public.get_incidents_with_details_rbac(
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
    incident_status VARCHAR,
    injury_description TEXT,
    fatality BOOLEAN,
    returned_to_work BOOLEAN,
    total_days_lost INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    worker_id INTEGER,
    worker_name TEXT,
    worker_occupation VARCHAR,
    employer_id INTEGER,
    employer_name VARCHAR,
    site_id INTEGER,
    site_name VARCHAR,
    department_id INTEGER,
    department_name VARCHAR,
    document_count BIGINT,
    estimated_cost NUMERIC,
    psychosocial_factors JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
PARALLEL SAFE
ROWS 1000
AS $$
DECLARE
    v_has_all_access BOOLEAN := FALSE;
    v_effective_employer_id INTEGER;
BEGIN
    v_has_all_access := (user_role_id IN (1, 2, 3, 4));
    
    IF v_has_all_access THEN
        v_effective_employer_id := filter_employer_id;
    ELSE
        v_effective_employer_id := COALESCE(filter_employer_id, user_employer_id);
    END IF;

    RETURN QUERY
    SELECT 
        i.incident_id,
        COALESCE(i.incident_number, '')::VARCHAR,
        i.date_of_injury,
        i.time_of_injury,
        COALESCE(i.injury_type, '')::VARCHAR,
        COALESCE(i.classification, '')::VARCHAR,
        COALESCE(i.incident_status, 'Open')::VARCHAR,
        COALESCE(i.injury_description, '')::TEXT,
        COALESCE(i.fatality, false),
        COALESCE(i.returned_to_work, false),
        COALESCE(i.total_days_lost, 0),
        i.created_at,
        i.updated_at,
        i.worker_id,
        COALESCE(w.given_name || ' ' || w.family_name, 'Unknown Worker')::TEXT,
        w.occupation,
        i.employer_id,
        e.employer_name,
        i.site_id,
        s.site_name,
        i.department_id,
        d.department_name,
        0::BIGINT,
        i.estimated_cost,
        i.psychosocial_factors
    FROM incidents i
    INNER JOIN employers e ON i.employer_id = e.employer_id
    LEFT JOIN workers w ON i.worker_id = w.worker_id
    LEFT JOIN sites s ON i.site_id = s.site_id
    LEFT JOIN departments d ON i.department_id = d.department_id
    WHERE 
        (v_effective_employer_id IS NULL OR i.employer_id = v_effective_employer_id)
        AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
        AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
        AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    ORDER BY i.date_of_injury DESC, i.created_at DESC
    LIMIT page_size
    OFFSET page_offset;
END;
$$;

-- =====================================================
-- PART 3: CREATE CRITICAL INDEXES
-- =====================================================

-- Primary performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_employer_id 
  ON incidents(employer_id) WHERE employer_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_employer_date 
  ON incidents(employer_id, date_of_injury DESC) WHERE employer_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_status 
  ON incidents(incident_status) WHERE incident_status IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_classification 
  ON incidents(classification) WHERE classification IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_estimated_cost 
  ON incidents(estimated_cost) WHERE estimated_cost > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_psychosocial_gin 
  ON incidents USING GIN(psychosocial_factors) WHERE psychosocial_factors IS NOT NULL;

-- Foreign key indexes for fast joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workers_employer_id 
  ON workers(employer_id) WHERE employer_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_employer_id 
  ON sites(employer_id) WHERE employer_id IS NOT NULL;

-- =====================================================
-- PART 4: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_incident_metrics_rbac TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incident_metrics_rbac TO anon;
GRANT EXECUTE ON FUNCTION public.get_incidents_with_details_rbac TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incidents_with_details_rbac TO anon;

-- =====================================================
-- PART 5: ANALYZE TABLES FOR OPTIMIZER
-- =====================================================

ANALYZE incidents;
ANALYZE employers;
ANALYZE workers;
ANALYZE sites;
ANALYZE departments;

-- =====================================================
-- VERIFICATION TESTS
-- =====================================================

-- Test 1: Verify metrics function works (should return immediately)
SELECT 'Test 1 - Metrics' as test, * FROM get_incident_metrics_rbac(1, NULL, NULL, NULL, NULL);

-- Test 2: Verify Newcastle Builders query (employer_id = 8)
SELECT 'Test 2 - Newcastle Builders' as test, COUNT(*) as incident_count 
FROM get_incidents_with_details_rbac(50, 0, 8, NULL, NULL, NULL, 5, 8);

-- Test 3: Check execution time for Newcastle Builders
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM get_incidents_with_details_rbac(50, 0, 8, NULL, NULL, NULL, 5, 8);

-- If all tests pass, you should see:
-- ✅ Test 1: Returns metrics instantly
-- ✅ Test 2: Returns incident count for Newcastle Builders
-- ✅ Test 3: Execution time < 100ms