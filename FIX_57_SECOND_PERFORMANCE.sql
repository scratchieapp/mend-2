-- =====================================================
-- OPTIMIZED FIX FOR 57-SECOND GET_DASHBOARD_DATA QUERY
-- =====================================================
-- This script contains multiple optimization strategies
-- Run the diagnosis script first to identify which fix to apply

-- =====================================================
-- FIX 1: DROP ALL OLD VERSIONS AND CREATE OPTIMIZED VERSION
-- =====================================================

-- First, drop any existing versions to avoid conflicts
DROP FUNCTION IF EXISTS public.get_dashboard_data CASCADE;

-- Create optimized version using PLPGSQL for better performance
CREATE OR REPLACE FUNCTION public.get_dashboard_data(
    page_size INTEGER DEFAULT 50,
    page_offset INTEGER DEFAULT 0,
    filter_employer_id INTEGER DEFAULT NULL,
    filter_worker_id INTEGER DEFAULT NULL,
    filter_start_date DATE DEFAULT NULL,
    filter_end_date DATE DEFAULT NULL,
    user_role_id INTEGER DEFAULT NULL,
    user_employer_id INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
    v_incidents JSON;
    v_total_count BIGINT;
    v_is_super_admin BOOLEAN;
    v_employer_filter INTEGER;
BEGIN
    -- Determine if user has super admin access
    v_is_super_admin := (user_role_id IN (1, 2, 3, 4));
    
    -- Determine employer filter
    IF v_is_super_admin THEN
        v_employer_filter := filter_employer_id; -- Can be NULL for all employers
    ELSE
        v_employer_filter := COALESCE(filter_employer_id, user_employer_id);
    END IF;
    
    -- Get total count first (optimized separately)
    SELECT COUNT(*)
    INTO v_total_count
    FROM incidents i
    WHERE 
        (v_employer_filter IS NULL OR i.employer_id = v_employer_filter)
        AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
        AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
        AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id);
    
    -- Get paginated incidents with joins
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    INTO v_incidents
    FROM (
        SELECT 
            i.incident_id,
            COALESCE(i.incident_number, '')::VARCHAR as incident_number,
            i.date_of_injury,
            i.time_of_injury,
            COALESCE(i.injury_type, '')::VARCHAR as injury_type,
            COALESCE(i.classification, '')::VARCHAR as classification,
            COALESCE(i.incident_status, 'Open')::VARCHAR as incident_status,
            COALESCE(i.injury_description, '')::TEXT as injury_description,
            COALESCE(i.fatality, false) as fatality,
            COALESCE(i.returned_to_work, false) as returned_to_work,
            COALESCE(i.total_days_lost, 0) as total_days_lost,
            i.created_at,
            i.updated_at,
            i.worker_id,
            COALESCE(w.given_name || ' ' || w.family_name, 'Unknown Worker')::TEXT as worker_name,
            COALESCE(w.occupation, '')::VARCHAR as worker_occupation,
            i.employer_id,
            COALESCE(e.employer_name, '')::VARCHAR as employer_name,
            i.site_id,
            COALESCE(s.site_name, '')::VARCHAR as site_name,
            i.department_id,
            COALESCE(d.department_name, '')::VARCHAR as department_name,
            0::BIGINT as document_count,
            i.estimated_cost,
            i.psychosocial_factors
        FROM incidents i
        INNER JOIN employers e ON i.employer_id = e.employer_id
        LEFT JOIN workers w ON i.worker_id = w.worker_id
        LEFT JOIN sites s ON i.site_id = s.site_id
        LEFT JOIN departments d ON i.department_id = d.department_id
        WHERE 
            (v_employer_filter IS NULL OR i.employer_id = v_employer_filter)
            AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
            AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
            AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
        ORDER BY i.date_of_injury DESC, i.incident_id DESC
        LIMIT page_size
        OFFSET page_offset
    ) t;
    
    -- Return combined result
    RETURN json_build_object(
        'incidents', v_incidents,
        'totalCount', v_total_count,
        'pageSize', page_size,
        'pageOffset', page_offset
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_dashboard_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_data TO anon;

-- =====================================================
-- FIX 2: CREATE ALL CRITICAL INDEXES
-- =====================================================
-- These indexes are essential for the function to perform well

-- Primary index for employer filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_employer_id 
  ON incidents(employer_id)
  WHERE employer_id IS NOT NULL;

-- Index for date sorting and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_date_of_injury_desc
  ON incidents(date_of_injury DESC NULLS LAST, incident_id DESC);

-- Composite index for the most common query pattern
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_employer_date_desc
  ON incidents(employer_id, date_of_injury DESC NULLS LAST, incident_id DESC)
  WHERE employer_id IS NOT NULL;

-- Index for worker filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_worker_id 
  ON incidents(worker_id)
  WHERE worker_id IS NOT NULL;

-- Indexes for JOIN performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workers_employer_id 
  ON workers(employer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_employer_id 
  ON sites(employer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_departments_employer_id 
  ON departments(employer_id);

-- Index for status filtering if used
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_status 
  ON incidents(incident_status)
  WHERE incident_status IS NOT NULL;

-- =====================================================
-- FIX 3: UPDATE TABLE STATISTICS
-- =====================================================
-- Ensure the query planner has accurate statistics

ANALYZE incidents;
ANALYZE employers;
ANALYZE workers;
ANALYZE sites;
ANALYZE departments;

-- =====================================================
-- FIX 4: CREATE MATERIALIZED VIEW (ALTERNATIVE APPROACH)
-- =====================================================
-- If the above doesn't work, consider a materialized view for super admin dashboard

/*
-- Only use this if the function is still slow after indexes
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_incidents_summary AS
SELECT 
    i.incident_id,
    i.incident_number,
    i.date_of_injury,
    i.time_of_injury,
    i.injury_type,
    i.classification,
    i.incident_status,
    i.injury_description,
    i.fatality,
    i.returned_to_work,
    i.total_days_lost,
    i.created_at,
    i.updated_at,
    i.worker_id,
    COALESCE(w.given_name || ' ' || w.family_name, 'Unknown Worker')::TEXT as worker_name,
    w.occupation as worker_occupation,
    i.employer_id,
    e.employer_name,
    i.site_id,
    s.site_name,
    i.department_id,
    d.department_name,
    i.estimated_cost,
    i.psychosocial_factors
FROM incidents i
INNER JOIN employers e ON i.employer_id = e.employer_id
LEFT JOIN workers w ON i.worker_id = w.worker_id
LEFT JOIN sites s ON i.site_id = s.site_id
LEFT JOIN departments d ON i.department_id = d.department_id;

-- Create indexes on the materialized view
CREATE INDEX idx_mv_dashboard_employer_id ON dashboard_incidents_summary(employer_id);
CREATE INDEX idx_mv_dashboard_date_desc ON dashboard_incidents_summary(date_of_injury DESC, incident_id DESC);
CREATE INDEX idx_mv_dashboard_worker_id ON dashboard_incidents_summary(worker_id);

-- Refresh the materialized view (run this periodically or after data changes)
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_incidents_summary;
*/

-- =====================================================
-- TEST THE OPTIMIZED FUNCTION
-- =====================================================

-- Test with timing enabled
\timing on

-- Test the function (should be < 1 second)
SELECT get_dashboard_data(50, 0, NULL, NULL, NULL, NULL, 1, NULL);

-- Analyze the query plan
EXPLAIN (ANALYZE, BUFFERS, TIMING ON)
SELECT get_dashboard_data(50, 0, NULL, NULL, NULL, NULL, 1, NULL);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify indexes are being used
SELECT 
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND tablename = 'incidents'
AND idx_scan > 0
ORDER BY idx_scan DESC;

-- Check function execution statistics (if pg_stat_statements is enabled)
SELECT 
    calls,
    total_time,
    mean_time,
    min_time,
    max_time
FROM pg_stat_statements
WHERE query LIKE '%get_dashboard_data%'
ORDER BY calls DESC
LIMIT 5;

-- =====================================================
-- ROLLBACK IF NEEDED
-- =====================================================

/*
-- If the new function causes issues, rollback to previous version:
DROP FUNCTION IF EXISTS public.get_dashboard_data CASCADE;
-- Then recreate the original function from your backups
*/

-- =====================================================
-- EXPECTED RESULTS
-- =====================================================

/*
After applying this fix, you should see:
1. Query execution time < 1 second (down from 57 seconds)
2. Index scans instead of sequential scans in EXPLAIN output
3. Lower CPU and I/O usage during dashboard loads
4. Consistent performance even with large datasets

If still slow after this fix:
1. Check network latency between app and database
2. Consider connection pooling issues
3. Look for client-side rendering bottlenecks
4. Check if multiple parallel calls are being made
5. Consider implementing query result caching
*/