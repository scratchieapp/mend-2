-- PERFORMANCE DIAGNOSTIC QUERIES
-- Run these in Supabase SQL Editor to identify the bottleneck

-- ============================================================================
-- 1. CHECK CURRENT FUNCTION PERFORMANCE
-- ============================================================================

-- Test current function with EXPLAIN ANALYZE
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM get_incidents_with_details_rbac(
    page_size := 25,
    page_offset := 0,
    filter_employer_id := NULL,
    filter_worker_id := NULL,
    filter_start_date := NULL,
    filter_end_date := NULL,
    user_role_id := 1,
    user_employer_id := NULL
);

-- ============================================================================
-- 2. CHECK IF INDEXES EXIST
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('incidents', 'employers', 'workers', 'sites', 'users')
ORDER BY tablename, indexname;

-- ============================================================================
-- 3. CHECK TABLE STATISTICS
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND tablename IN ('incidents', 'employers', 'workers', 'sites', 'users')
ORDER BY tablename;

-- ============================================================================
-- 4. CHECK SLOW QUERIES
-- ============================================================================

-- Show current running queries
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
    AND state != 'idle'
ORDER BY duration DESC;

-- ============================================================================
-- 5. TEST RAW QUERY PERFORMANCE
-- ============================================================================

-- Test raw incident query without function
EXPLAIN ANALYZE
SELECT 
    i.incident_id,
    i.date_of_injury,
    i.incident_status,
    e.employer_name,
    w.given_name,
    w.family_name
FROM incidents i
LEFT JOIN employers e ON i.employer_id = e.employer_id
LEFT JOIN workers w ON i.worker_id = w.worker_id
ORDER BY i.date_of_injury DESC
LIMIT 25;

-- ============================================================================
-- 6. COUNT TOTAL INCIDENTS
-- ============================================================================

SELECT 
    COUNT(*) as total_incidents,
    COUNT(DISTINCT employer_id) as unique_employers,
    COUNT(DISTINCT worker_id) as unique_workers
FROM incidents;

-- ============================================================================
-- 7. CHECK FOR MISSING INDEXES WARNING
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
    AND tablename = 'incidents'
    AND n_distinct > 100
    AND correlation < 0.1
ORDER BY n_distinct DESC;

-- ============================================================================
-- 8. IDENTIFY EXACT BOTTLENECK
-- ============================================================================

-- This will show exactly which part of the query is slow
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT 
    i.*,
    e.employer_name,
    w.given_name || ' ' || w.family_name as worker_name,
    s.site_name,
    (SELECT COUNT(*) FROM incident_documents WHERE incident_id = i.incident_id) as doc_count
FROM incidents i
LEFT JOIN employers e ON i.employer_id = e.employer_id
LEFT JOIN workers w ON i.worker_id = w.worker_id
LEFT JOIN sites s ON i.site_id = s.site_id
ORDER BY i.date_of_injury DESC, i.incident_id DESC
LIMIT 25;

-- ============================================================================
-- OUTPUT INTERPRETATION
-- ============================================================================

/*
WHAT TO LOOK FOR:

1. In EXPLAIN ANALYZE output:
   - Look for "Seq Scan" (bad) vs "Index Scan" (good)
   - Check "actual time" - anything over 1000ms is problematic
   - Look for high "rows" numbers being filtered

2. Missing indexes:
   - If you see Seq Scan on large tables, you need indexes
   - Check if the ORDER BY columns have indexes

3. Statistics:
   - If last_analyze is old, run: ANALYZE tablename;
   - High dead_rows means you need VACUUM

4. Slow queries:
   - Any query running over 5 seconds is a problem
   - Look for blocked queries (waiting state)

5. If raw query is fast but function is slow:
   - Problem is in the function logic
   - May need to rewrite the function

Run these queries and check the results to identify the exact cause of slowness.
*/