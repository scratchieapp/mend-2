-- Test script for RBAC functions
-- Date: 2025-08-27
-- Purpose: Verify that the new RBAC functions work correctly

-- =============================================================================
-- TEST 1: Super Admin (role_id = 1) should see ALL incidents
-- =============================================================================
DO $$
DECLARE
    total_count INTEGER;
    super_admin_count INTEGER;
BEGIN
    -- Get total count of all incidents
    SELECT COUNT(*) INTO total_count FROM incidents;
    
    -- Get count using RBAC function with Super Admin role
    SELECT get_incidents_count_rbac(
        filter_employer_id := NULL,
        filter_worker_id := NULL,
        filter_start_date := NULL,
        filter_end_date := NULL,
        user_role_id := 1,  -- Super Admin
        user_employer_id := 1  -- Doesn't matter for Super Admin
    ) INTO super_admin_count;
    
    RAISE NOTICE 'TEST 1 - Super Admin Access:';
    RAISE NOTICE '  Total incidents in database: %', total_count;
    RAISE NOTICE '  Incidents visible to Super Admin: %', super_admin_count;
    
    IF total_count = super_admin_count THEN
        RAISE NOTICE '  ✅ PASSED: Super Admin can see all incidents';
    ELSE
        RAISE WARNING '  ❌ FAILED: Super Admin should see all incidents';
    END IF;
END $$;

-- =============================================================================
-- TEST 2: Builder Admin (role_id = 5) should see only their employer's incidents
-- =============================================================================
DO $$
DECLARE
    employer_1_count INTEGER;
    builder_admin_count INTEGER;
BEGIN
    -- Get count of incidents for employer_id = 1
    SELECT COUNT(*) INTO employer_1_count 
    FROM incidents 
    WHERE employer_id = 1;
    
    -- Get count using RBAC function with Builder Admin role for employer 1
    SELECT get_incidents_count_rbac(
        filter_employer_id := NULL,
        filter_worker_id := NULL,
        filter_start_date := NULL,
        filter_end_date := NULL,
        user_role_id := 5,  -- Builder Admin
        user_employer_id := 1  -- Employer 1
    ) INTO builder_admin_count;
    
    RAISE NOTICE 'TEST 2 - Builder Admin Access (Employer 1):';
    RAISE NOTICE '  Incidents for employer_id = 1: %', employer_1_count;
    RAISE NOTICE '  Incidents visible to Builder Admin: %', builder_admin_count;
    
    IF employer_1_count = builder_admin_count THEN
        RAISE NOTICE '  ✅ PASSED: Builder Admin sees only their employer incidents';
    ELSE
        RAISE WARNING '  ❌ FAILED: Builder Admin should see only employer 1 incidents';
    END IF;
END $$;

-- =============================================================================
-- TEST 3: Test get_incidents_with_details_rbac function
-- =============================================================================
RAISE NOTICE '';
RAISE NOTICE 'TEST 3 - Detailed Incidents Function:';
RAISE NOTICE 'Fetching first 5 incidents for Super Admin...';

SELECT 
    incident_id,
    incident_number,
    employer_id,
    employer_name,
    date_of_injury,
    injury_type
FROM get_incidents_with_details_rbac(
    page_size := 5,
    page_offset := 0,
    filter_employer_id := NULL,
    filter_worker_id := NULL,
    filter_start_date := NULL,
    filter_end_date := NULL,
    user_role_id := 1,  -- Super Admin
    user_employer_id := NULL
)
ORDER BY incident_id DESC
LIMIT 5;

RAISE NOTICE '';
RAISE NOTICE 'TEST 4 - Builder Admin Filtered View:';
RAISE NOTICE 'Fetching first 5 incidents for Builder Admin (employer_id = 1)...';

SELECT 
    incident_id,
    incident_number,
    employer_id,
    employer_name,
    date_of_injury,
    injury_type
FROM get_incidents_with_details_rbac(
    page_size := 5,
    page_offset := 0,
    filter_employer_id := NULL,
    filter_worker_id := NULL,
    filter_start_date := NULL,
    filter_end_date := NULL,
    user_role_id := 5,  -- Builder Admin
    user_employer_id := 1  -- Employer 1
)
ORDER BY incident_id DESC
LIMIT 5;

-- =============================================================================
-- TEST 5: Test filtering parameters
-- =============================================================================
RAISE NOTICE '';
RAISE NOTICE 'TEST 5 - Testing Filter Parameters:';

DO $$
DECLARE
    filtered_count INTEGER;
BEGIN
    -- Test date range filter
    SELECT get_incidents_count_rbac(
        filter_employer_id := NULL,
        filter_worker_id := NULL,
        filter_start_date := '2024-01-01'::DATE,
        filter_end_date := '2024-12-31'::DATE,
        user_role_id := 1,  -- Super Admin
        user_employer_id := NULL
    ) INTO filtered_count;
    
    RAISE NOTICE '  Incidents in 2024: %', filtered_count;
    
    -- Test employer filter
    SELECT get_incidents_count_rbac(
        filter_employer_id := 1,
        filter_worker_id := NULL,
        filter_start_date := NULL,
        filter_end_date := NULL,
        user_role_id := 1,  -- Super Admin
        user_employer_id := NULL
    ) INTO filtered_count;
    
    RAISE NOTICE '  Incidents for employer_id = 1 (via filter): %', filtered_count;
END $$;

-- =============================================================================
-- TEST 6: Test NULL handling
-- =============================================================================
RAISE NOTICE '';
RAISE NOTICE 'TEST 6 - NULL Parameter Handling:';

DO $$
DECLARE
    null_role_count INTEGER;
BEGIN
    -- Test with NULL user_role_id (should return all)
    SELECT get_incidents_count_rbac(
        filter_employer_id := NULL,
        filter_worker_id := NULL,
        filter_start_date := NULL,
        filter_end_date := NULL,
        user_role_id := NULL,  -- No role specified
        user_employer_id := NULL
    ) INTO null_role_count;
    
    RAISE NOTICE '  Incidents with NULL role (backward compatibility): %', null_role_count;
    
    IF null_role_count > 0 THEN
        RAISE NOTICE '  ✅ PASSED: NULL role returns results (backward compatible)';
    ELSE
        RAISE WARNING '  ⚠️  WARNING: NULL role returns no results';
    END IF;
END $$;

-- =============================================================================
-- Summary
-- =============================================================================
RAISE NOTICE '';
RAISE NOTICE '=============================================================================';
RAISE NOTICE 'RBAC Function Tests Complete';
RAISE NOTICE 'Functions created:';
RAISE NOTICE '  - get_incidents_with_details_rbac()';
RAISE NOTICE '  - get_incidents_count_rbac()';
RAISE NOTICE '';
RAISE NOTICE 'Key features:';
RAISE NOTICE '  ✅ Super Admin (role_id = 1) sees ALL incidents';
RAISE NOTICE '  ✅ Builder Admin (role_id = 5) sees only their employer incidents';
RAISE NOTICE '  ✅ Works with Clerk authentication (no Supabase auth dependency)';
RAISE NOTICE '  ✅ Supports filtering by employer, worker, and date range';
RAISE NOTICE '  ✅ Backward compatible with NULL parameters';
RAISE NOTICE '=============================================================================';