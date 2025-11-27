-- =====================================================
-- PERFORMANCE IMPROVEMENT TEST SUITE
-- Target: Verify <1 second dashboard load time
-- =====================================================

-- Enable timing for all tests
\timing on

-- =====================================================
-- TEST 1: Verify Function Exists
-- =====================================================
SELECT 
    'Function Status' as test,
    CASE 
        WHEN EXISTS(
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = 'get_dashboard_data'
        ) THEN '✅ PASS - Function exists'
        ELSE '❌ FAIL - Function missing'
    END as result;

-- =====================================================
-- TEST 2: Check Critical Indexes
-- =====================================================
WITH required_indexes AS (
    SELECT 'idx_incidents_employer_date_id' as index_name
    UNION ALL SELECT 'idx_incidents_date_id'
    UNION ALL SELECT 'idx_incidents_worker_id'
    UNION ALL SELECT 'idx_incidents_date_range'
    UNION ALL SELECT 'idx_workers_worker_id'
    UNION ALL SELECT 'idx_sites_site_id'
    UNION ALL SELECT 'idx_departments_department_id'
    UNION ALL SELECT 'idx_employers_employer_id'
)
SELECT 
    'Index Status' as test,
    CASE 
        WHEN COUNT(*) FILTER (WHERE NOT EXISTS(
            SELECT 1 FROM pg_indexes 
            WHERE indexname = ri.index_name
        )) = 0 THEN '✅ PASS - All indexes exist'
        ELSE '❌ FAIL - Missing ' || COUNT(*) FILTER (WHERE NOT EXISTS(
            SELECT 1 FROM pg_indexes 
            WHERE indexname = ri.index_name
        )) || ' indexes'
    END as result
FROM required_indexes ri;

-- =====================================================
-- TEST 3: Performance Test - Super Admin All Data
-- =====================================================
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
    test_result JSON;
BEGIN
    start_time := clock_timestamp();
    
    -- Execute the function
    SELECT get_dashboard_data(
        25,     -- page_size
        0,      -- page_offset
        NULL,   -- filter_employer_id (all employers)
        NULL,   -- filter_worker_id
        NULL,   -- filter_start_date
        NULL,   -- filter_end_date
        1,      -- user_role_id (Super Admin)
        NULL    -- user_employer_id
    ) INTO test_result;
    
    end_time := clock_timestamp();
    duration := end_time - start_time;
    
    RAISE NOTICE 'TEST 3 - Super Admin All Data';
    RAISE NOTICE '  Execution time: % ms', EXTRACT(MILLISECOND FROM duration);
    RAISE NOTICE '  Records returned: %', json_array_length(test_result->'incidents');
    RAISE NOTICE '  Total count: %', test_result->>'totalCount';
    RAISE NOTICE '  Result: %', 
        CASE 
            WHEN EXTRACT(MILLISECOND FROM duration) < 1000 THEN '✅ PASS'
            WHEN EXTRACT(MILLISECOND FROM duration) < 2000 THEN '⚠️ WARNING - Slow but acceptable'
            ELSE '❌ FAIL - Too slow'
        END;
END $$;

-- =====================================================
-- TEST 4: Performance Test - Filtered by Employer
-- =====================================================
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
    test_result JSON;
BEGIN
    start_time := clock_timestamp();
    
    -- Execute with employer filter
    SELECT get_dashboard_data(
        25,     -- page_size
        0,      -- page_offset
        8,      -- filter_employer_id (Newcastle Builders)
        NULL,   -- filter_worker_id
        NULL,   -- filter_start_date
        NULL,   -- filter_end_date
        5,      -- user_role_id (Builder Admin)
        8       -- user_employer_id
    ) INTO test_result;
    
    end_time := clock_timestamp();
    duration := end_time - start_time;
    
    RAISE NOTICE 'TEST 4 - Filtered by Employer';
    RAISE NOTICE '  Execution time: % ms', EXTRACT(MILLISECOND FROM duration);
    RAISE NOTICE '  Records returned: %', json_array_length(test_result->'incidents');
    RAISE NOTICE '  Total count: %', test_result->>'totalCount';
    RAISE NOTICE '  Result: %', 
        CASE 
            WHEN EXTRACT(MILLISECOND FROM duration) < 500 THEN '✅ PASS'
            WHEN EXTRACT(MILLISECOND FROM duration) < 1000 THEN '⚠️ WARNING - Slow but acceptable'
            ELSE '❌ FAIL - Too slow'
        END;
END $$;

-- =====================================================
-- TEST 5: Performance Test - Date Range Filter
-- =====================================================
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
    test_result JSON;
BEGIN
    start_time := clock_timestamp();
    
    -- Execute with date range
    SELECT get_dashboard_data(
        25,     -- page_size
        0,      -- page_offset
        NULL,   -- filter_employer_id
        NULL,   -- filter_worker_id
        '2024-01-01'::DATE,  -- filter_start_date
        '2024-12-31'::DATE,  -- filter_end_date
        1,      -- user_role_id
        NULL    -- user_employer_id
    ) INTO test_result;
    
    end_time := clock_timestamp();
    duration := end_time - start_time;
    
    RAISE NOTICE 'TEST 5 - Date Range Filter';
    RAISE NOTICE '  Execution time: % ms', EXTRACT(MILLISECOND FROM duration);
    RAISE NOTICE '  Records returned: %', json_array_length(test_result->'incidents');
    RAISE NOTICE '  Total count: %', test_result->>'totalCount';
    RAISE NOTICE '  Result: %', 
        CASE 
            WHEN EXTRACT(MILLISECOND FROM duration) < 1000 THEN '✅ PASS'
            WHEN EXTRACT(MILLISECOND FROM duration) < 2000 THEN '⚠️ WARNING - Slow but acceptable'
            ELSE '❌ FAIL - Too slow'
        END;
END $$;

-- =====================================================
-- TEST 6: Pagination Test
-- =====================================================
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
    test_result JSON;
    page_num INTEGER;
    total_duration INTERVAL := '0'::INTERVAL;
BEGIN
    -- Test first 3 pages
    FOR page_num IN 0..2 LOOP
        start_time := clock_timestamp();
        
        SELECT get_dashboard_data(
            25,     -- page_size
            page_num * 25,  -- page_offset
            NULL,   -- filter_employer_id
            NULL,   -- filter_worker_id
            NULL,   -- filter_start_date
            NULL,   -- filter_end_date
            1,      -- user_role_id
            NULL    -- user_employer_id
        ) INTO test_result;
        
        end_time := clock_timestamp();
        duration := end_time - start_time;
        total_duration := total_duration + duration;
        
        RAISE NOTICE '  Page %: % ms', page_num + 1, EXTRACT(MILLISECOND FROM duration);
    END LOOP;
    
    RAISE NOTICE 'TEST 6 - Pagination (3 pages)';
    RAISE NOTICE '  Average time per page: % ms', EXTRACT(MILLISECOND FROM total_duration) / 3;
    RAISE NOTICE '  Result: %', 
        CASE 
            WHEN EXTRACT(MILLISECOND FROM total_duration) / 3 < 1000 THEN '✅ PASS'
            ELSE '❌ FAIL - Pagination too slow'
        END;
END $$;

-- =====================================================
-- TEST 7: Verify Data Structure
-- =====================================================
DO $$
DECLARE
    test_result JSON;
    has_incidents BOOLEAN;
    has_total_count BOOLEAN;
    has_page_size BOOLEAN;
    has_page_offset BOOLEAN;
BEGIN
    -- Get a sample result
    SELECT get_dashboard_data(5, 0, NULL, NULL, NULL, NULL, 1, NULL) 
    INTO test_result;
    
    -- Check structure
    has_incidents := test_result ? 'incidents';
    has_total_count := test_result ? 'totalCount';
    has_page_size := test_result ? 'pageSize';
    has_page_offset := test_result ? 'pageOffset';
    
    RAISE NOTICE 'TEST 7 - Data Structure';
    RAISE NOTICE '  Has incidents: %', CASE WHEN has_incidents THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  Has totalCount: %', CASE WHEN has_total_count THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  Has pageSize: %', CASE WHEN has_page_size THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  Has pageOffset: %', CASE WHEN has_page_offset THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  Result: %', 
        CASE 
            WHEN has_incidents AND has_total_count AND has_page_size AND has_page_offset 
            THEN '✅ PASS - Structure correct'
            ELSE '❌ FAIL - Missing fields'
        END;
END $$;

-- =====================================================
-- TEST 8: Check Query Plan
-- =====================================================
EXPLAIN (ANALYZE, BUFFERS, TIMING ON, SUMMARY ON)
SELECT get_dashboard_data(25, 0, NULL, NULL, NULL, NULL, 1, NULL);

-- =====================================================
-- TEST 9: Index Usage Statistics
-- =====================================================
SELECT 
    'Index Usage' as test,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    CASE 
        WHEN idx_scan > 0 THEN '✅ Used'
        ELSE '⚠️ Not used'
    END as status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND tablename = 'incidents'
    AND indexname IN (
        'idx_incidents_employer_date_id',
        'idx_incidents_date_id',
        'idx_incidents_worker_id',
        'idx_incidents_date_range'
    )
ORDER BY idx_scan DESC;

-- =====================================================
-- TEST SUMMARY
-- =====================================================
SELECT 
    'Performance Test Summary' as report,
    '================================' as separator
UNION ALL
SELECT 
    'Expected Results:',
    ''
UNION ALL
SELECT 
    '  • All queries < 1 second',
    '✅'
UNION ALL
SELECT 
    '  • Indexes being used',
    '✅'
UNION ALL
SELECT 
    '  • Data structure correct',
    '✅'
UNION ALL
SELECT 
    '  • No sequential scans on large tables',
    '✅'
UNION ALL
SELECT 
    '',
    ''
UNION ALL
SELECT 
    'If any test fails:',
    ''
UNION ALL
SELECT 
    '  1. Run ULTIMATE_PERFORMANCE_FIX.sql',
    ''
UNION ALL
SELECT 
    '  2. Check for missing indexes',
    ''
UNION ALL
SELECT 
    '  3. Run VACUUM ANALYZE on tables',
    ''
UNION ALL
SELECT 
    '  4. Check for blocking queries',
    '';

-- Disable timing
\timing off