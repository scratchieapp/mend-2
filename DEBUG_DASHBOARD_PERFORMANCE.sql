-- =====================================================
-- DASHBOARD PERFORMANCE DEBUGGING
-- =====================================================
-- Run these queries to understand what's happening

-- 1. Check what parameters are being passed in actual use
-- This simulates what the dashboard is doing
SELECT 'Dashboard Query Test' as test_name,
       COUNT(*) as row_count,
       COUNT(DISTINCT employer_id) as unique_employers,
       STRING_AGG(DISTINCT employer_name, ', ') as employer_names
FROM get_incidents_with_details_rbac(
    50,     -- page_size
    0,      -- page_offset
    NULL,   -- filter_employer_id (NULL = all companies for super admin)
    NULL,   -- filter_worker_id
    NULL,   -- filter_start_date
    NULL,   -- filter_end_date
    1,      -- user_role_id (super admin)
    NULL    -- user_employer_id
);

-- 2. Check if there's an issue with the employer filtering logic
SELECT 'Employer Distribution' as test_name,
       employer_id,
       employer_name,
       COUNT(*) as incident_count
FROM incidents i
JOIN employers e ON i.employer_id = e.employer_id
GROUP BY employer_id, employer_name
ORDER BY incident_count DESC;

-- 3. Test with explicit timing
EXPLAIN (ANALYZE, BUFFERS, TIMING ON, VERBOSE)
SELECT * FROM get_incidents_with_details_rbac(
    50,     -- page_size
    0,      -- page_offset
    NULL,   -- filter_employer_id
    NULL,   -- filter_worker_id
    NULL,   -- filter_start_date
    NULL,   -- filter_end_date
    1,      -- user_role_id
    NULL    -- user_employer_id
);

-- 4. Check if indexes are being used
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'incidents'
AND idx_scan > 0
ORDER BY idx_scan DESC;

-- 5. Check for lock contention
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    query_start,
    state,
    wait_event_type,
    wait_event,
    query
FROM pg_stat_activity
WHERE state != 'idle'
AND query LIKE '%incidents%'
ORDER BY query_start;
