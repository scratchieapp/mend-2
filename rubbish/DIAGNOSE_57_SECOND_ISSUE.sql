-- =====================================================
-- COMPREHENSIVE DIAGNOSIS FOR 57-SECOND QUERY ISSUE
-- =====================================================
-- Run each section in Supabase SQL Editor to identify the bottleneck

-- =====================================================
-- SECTION 1: CHECK FUNCTION EXISTENCE AND VERSIONS
-- =====================================================

-- List all versions of get_dashboard_data function
SELECT 
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'get_dashboard_data';

-- =====================================================
-- SECTION 2: TEST CURRENT PERFORMANCE WITH TIMING
-- =====================================================

-- Enable timing to see exact execution time
\timing on

-- Test the actual function being called by the app
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, TIMING ON)
SELECT get_dashboard_data(
    50,     -- page_size
    0,      -- page_offset
    NULL,   -- filter_employer_id
    NULL,   -- filter_worker_id
    NULL,   -- filter_start_date
    NULL,   -- filter_end_date
    1,      -- user_role_id (Super Admin)
    NULL    -- user_employer_id
);

-- =====================================================
-- SECTION 3: CHECK IF INDEXES EXIST AND ARE BEING USED
-- =====================================================

-- List all indexes on incidents table
SELECT 
    indexname,
    indexdef,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_indexes
LEFT JOIN pg_stat_user_indexes USING (schemaname, tablename, indexname)
WHERE tablename = 'incidents'
AND schemaname = 'public'
ORDER BY idx_scan DESC NULLS LAST;

-- Check if critical indexes exist
SELECT 
    'idx_incidents_employer_id' as index_name,
    EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_incidents_employer_id') as exists,
    'CRITICAL for employer filtering' as purpose
UNION ALL
SELECT 
    'idx_incidents_date_of_injury',
    EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_incidents_date_of_injury'),
    'CRITICAL for date sorting'
UNION ALL
SELECT 
    'idx_incidents_employer_status_date',
    EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_incidents_employer_status_date'),
    'COMPOSITE for optimal query'
UNION ALL
SELECT 
    'idx_incidents_employer_date',
    EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_incidents_employer_date'),
    'COMPOSITE for date filtering';

-- =====================================================
-- SECTION 4: ANALYZE THE QUERY PLAN COMPONENTS
-- =====================================================

-- Test the CTE components separately to find bottleneck

-- 4A. Test incident data retrieval (main query)
EXPLAIN (ANALYZE, BUFFERS, TIMING ON)
SELECT 
    i.incident_id,
    i.date_of_injury,
    e.employer_name,
    w.given_name || ' ' || w.family_name as worker_name,
    s.site_name,
    d.department_name
FROM incidents i
INNER JOIN employers e ON i.employer_id = e.employer_id
LEFT JOIN workers w ON i.worker_id = w.worker_id
LEFT JOIN sites s ON i.site_id = s.site_id
LEFT JOIN departments d ON i.department_id = d.department_id
ORDER BY i.date_of_injury DESC, i.incident_id DESC
LIMIT 50;

-- 4B. Test count query separately
EXPLAIN (ANALYZE, BUFFERS, TIMING ON)
SELECT COUNT(*) 
FROM incidents i
WHERE true; -- No filters for super admin viewing all

-- =====================================================
-- SECTION 5: CHECK FOR BLOCKING OR LOCK ISSUES
-- =====================================================

-- Check for active long-running queries
SELECT 
    pid,
    now() - query_start as duration,
    state,
    wait_event_type,
    wait_event,
    LEFT(query, 100) as query_sample
FROM pg_stat_activity
WHERE state != 'idle'
AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC NULLS LAST;

-- Check for lock contention
SELECT 
    relation::regclass,
    mode,
    pid,
    granted
FROM pg_locks
WHERE relation IN (
    'incidents'::regclass,
    'employers'::regclass,
    'workers'::regclass,
    'sites'::regclass,
    'departments'::regclass
)
ORDER BY relation, granted;

-- =====================================================
-- SECTION 6: CHECK TABLE STATISTICS
-- =====================================================

-- Check table sizes and statistics freshness
SELECT 
    schemaname,
    tablename,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND tablename IN ('incidents', 'employers', 'workers', 'sites', 'departments')
ORDER BY n_live_tup DESC;

-- =====================================================
-- SECTION 7: TEST SIMPLIFIED QUERIES
-- =====================================================

-- 7A. Test minimal query without JSON aggregation
EXPLAIN (ANALYZE, BUFFERS, TIMING ON)
SELECT 
    i.*,
    e.employer_name
FROM incidents i
JOIN employers e ON i.employer_id = e.employer_id
ORDER BY i.date_of_injury DESC
LIMIT 50;

-- 7B. Test with JSON but no CTEs
EXPLAIN (ANALYZE, BUFFERS, TIMING ON)
SELECT json_build_object(
    'incidents', json_agg(sub.*),
    'totalCount', (SELECT COUNT(*) FROM incidents)
)
FROM (
    SELECT 
        i.incident_id,
        i.date_of_injury,
        e.employer_name
    FROM incidents i
    JOIN employers e ON i.employer_id = e.employer_id
    ORDER BY i.date_of_injury DESC
    LIMIT 50
) sub;

-- =====================================================
-- SECTION 8: CHECK FOR DUPLICATE FUNCTION CALLS
-- =====================================================

-- Check if function is being called multiple times
SELECT 
    calls,
    total_time,
    mean_time,
    min_time,
    max_time,
    query
FROM pg_stat_statements
WHERE query LIKE '%get_dashboard_data%'
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- SECTION 9: VACUUM AND ANALYZE IF NEEDED
-- =====================================================

-- If statistics are old, run these:
-- VACUUM ANALYZE incidents;
-- VACUUM ANALYZE employers;
-- VACUUM ANALYZE workers;
-- VACUUM ANALYZE sites;
-- VACUUM ANALYZE departments;

-- =====================================================
-- SECTION 10: CREATE MISSING INDEXES IF NEEDED
-- =====================================================

-- Only run these if the indexes don't exist from Section 3:

/*
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_employer_id 
  ON incidents(employer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_date_of_injury 
  ON incidents(date_of_injury DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_employer_date 
  ON incidents(employer_id, date_of_injury DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workers_employer_id 
  ON workers(employer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_employer_id 
  ON sites(employer_id);
*/

-- =====================================================
-- OUTPUT INTERPRETATION GUIDE
-- =====================================================

/*
WHAT TO LOOK FOR IN RESULTS:

1. FUNCTION VERSIONS (Section 1):
   - Should only have ONE version of get_dashboard_data
   - If multiple versions exist, DROP the old ones

2. QUERY PLAN (Section 2):
   - Look for "Seq Scan" on large tables = BAD (needs index)
   - Look for "Nested Loop" with high cost = BAD (needs optimization)
   - Total execution time > 1000ms = Problem identified

3. INDEXES (Section 3):
   - Any critical index showing "false" for exists = CREATE IT
   - idx_scan = 0 means index exists but isn't being used

4. COMPONENT TESTS (Section 4):
   - If 4A is slow = Join/sorting issue
   - If 4B is slow = Count optimization needed

5. BLOCKING (Section 5):
   - Any query with duration > 5 seconds = Problem
   - Locks not granted = Contention issue

6. STATISTICS (Section 6):
   - last_analyze > 1 day ago = Run VACUUM ANALYZE
   - dead_rows > 10% of live_rows = Need VACUUM

7. SIMPLIFIED QUERIES (Section 7):
   - If 7A is fast but function is slow = JSON aggregation issue
   - If 7B is slow = CTE optimization needed

MOST COMMON FIXES:
1. Create missing indexes (Section 10)
2. Run VACUUM ANALYZE (Section 9)
3. Drop duplicate functions
4. Rewrite function to avoid CTEs if they're slow
*/