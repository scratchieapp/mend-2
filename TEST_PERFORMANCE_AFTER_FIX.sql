-- =====================================================
-- PERFORMANCE TESTING SCRIPT
-- Execute this after applying the fix to verify performance
-- Go to: https://supabase.com/dashboard/project/rkzcybthcszeusrohbtc/sql/new
-- =====================================================

-- Test 1: Quick function test (should return execution time)
SELECT 
    'Quick Test' as test_name,
    json_extract_path_text(
        get_dashboard_data(5, 0, NULL, NULL, NULL, NULL, 1, NULL)::json,
        'executionTime'
    ) || ' ms' as execution_time,
    json_extract_path_text(
        get_dashboard_data(5, 0, NULL, NULL, NULL, NULL, 1, NULL)::json,
        'totalCount'
    ) as total_records;

-- Test 2: Super admin viewing all incidents (worst case scenario)
EXPLAIN (ANALYZE, BUFFERS, TIMING ON, FORMAT JSON)
SELECT get_dashboard_data(
    25,     -- page_size
    0,      -- page_offset
    NULL,   -- filter_employer_id (NULL = all)
    NULL,   -- filter_worker_id
    NULL,   -- filter_start_date
    NULL,   -- filter_end_date
    1,      -- user_role_id (Super Admin)
    NULL    -- user_employer_id
);

-- Test 3: Regular user with employer filter (common case)
EXPLAIN (ANALYZE, BUFFERS, TIMING ON, FORMAT JSON)
SELECT get_dashboard_data(
    25,     -- page_size
    0,      -- page_offset
    8,      -- filter_employer_id (Newcastle Builders)
    NULL,   -- filter_worker_id
    NULL,   -- filter_start_date
    NULL,   -- filter_end_date
    5,      -- user_role_id (Builder Admin)
    8       -- user_employer_id
);

-- Test 4: Multiple execution times to check consistency
WITH performance_tests AS (
    SELECT 
        1 as test_num,
        json_extract_path_text(
            get_dashboard_data(25, 0, NULL, NULL, NULL, NULL, 1, NULL)::json,
            'executionTime'
        )::numeric as exec_time
    UNION ALL
    SELECT 
        2 as test_num,
        json_extract_path_text(
            get_dashboard_data(25, 0, NULL, NULL, NULL, NULL, 1, NULL)::json,
            'executionTime'
        )::numeric as exec_time
    UNION ALL
    SELECT 
        3 as test_num,
        json_extract_path_text(
            get_dashboard_data(25, 0, NULL, NULL, NULL, NULL, 1, NULL)::json,
            'executionTime'
        )::numeric as exec_time
)
SELECT 
    'Performance Summary' as metric,
    COUNT(*) as test_runs,
    ROUND(MIN(exec_time), 2) || ' ms' as min_time,
    ROUND(AVG(exec_time), 2) || ' ms' as avg_time,
    ROUND(MAX(exec_time), 2) || ' ms' as max_time,
    CASE 
        WHEN MAX(exec_time) < 1000 THEN '✅ PASS - Under 1 second'
        WHEN MAX(exec_time) < 2000 THEN '⚠️ WARNING - 1-2 seconds'
        ELSE '❌ FAIL - Over 2 seconds'
    END as status
FROM performance_tests;

-- Test 5: Check index usage
SELECT 
    n.nspname AS schema_name,
    t.relname AS table_name,
    i.relname AS index_name,
    idx_stat.idx_scan AS times_used,
    pg_size_pretty(pg_relation_size(i.oid)) AS index_size,
    idx_stat.idx_tup_read AS tuples_read,
    idx_stat.idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes idx_stat
JOIN pg_index idx ON idx_stat.indexrelid = idx.indexrelid
JOIN pg_class i ON i.oid = idx.indexrelid
JOIN pg_class t ON t.oid = idx.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
    AND t.relname = 'incidents'
    AND idx_stat.idx_scan > 0
ORDER BY idx_stat.idx_scan DESC;

-- Test 6: Verify function exists and has correct structure
SELECT 
    proname as function_name,
    pronargs as num_arguments,
    pg_get_function_result(oid) as return_type,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'get_dashboard_data'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- SUCCESS CRITERIA:
-- ✅ Execution time < 1000ms (1 second) for all tests
-- ✅ Indexes are being used (idx_scan > 0)
-- ✅ Function returns proper JSON structure
-- ✅ No errors during execution