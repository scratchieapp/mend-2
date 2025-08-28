-- =====================================================
-- FIX FOR DEPLOYMENT ISSUES
-- =====================================================
-- Run this in Supabase SQL Editor to fix the remaining issues

-- =====================================================
-- PART 1: Fix the Type Mismatch in get_incidents_with_details_rbac
-- =====================================================
-- Drop and recreate with all proper type casting

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
    -- Check if user has all-company access
    v_has_all_access := (user_role_id IN (1, 2, 3, 4));
    
    -- Determine the effective employer ID for filtering
    IF v_has_all_access THEN
        v_effective_employer_id := filter_employer_id; -- Can be NULL for "all companies"
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
        COALESCE(w.given_name || ' ' || w.family_name, 'Unknown Worker')::TEXT as worker_name,
        COALESCE(w.occupation, '')::VARCHAR as worker_occupation,  -- CRITICAL FIX: Cast to VARCHAR
        i.employer_id,
        COALESCE(e.employer_name, '')::VARCHAR,  -- CRITICAL FIX: Cast to VARCHAR
        i.site_id,
        COALESCE(s.site_name, '')::VARCHAR,      -- CRITICAL FIX: Cast to VARCHAR
        i.department_id,
        COALESCE(d.department_name, '')::VARCHAR, -- CRITICAL FIX: Cast to VARCHAR
        0::BIGINT as document_count,
        i.estimated_cost,
        i.psychosocial_factors
    FROM incidents i
    INNER JOIN employers e ON i.employer_id = e.employer_id
    LEFT JOIN workers w ON i.worker_id = w.worker_id
    LEFT JOIN sites s ON i.site_id = s.site_id
    LEFT JOIN departments d ON i.department_id = d.department_id
    WHERE 
        -- Employer filtering (most selective filter first)
        (v_effective_employer_id IS NULL OR i.employer_id = v_effective_employer_id)
        -- Date range filtering
        AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
        AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
        -- Worker filtering
        AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    ORDER BY i.date_of_injury DESC, i.created_at DESC
    LIMIT page_size
    OFFSET page_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_incidents_with_details_rbac TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incidents_with_details_rbac TO anon;

-- =====================================================
-- PART 2: Create Missing Indexes WITHOUT CONCURRENTLY
-- =====================================================
-- These can run in a transaction

-- Check if indexes exist before creating
DO $$
BEGIN
    -- Index on employer_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_incidents_employer_id') THEN
        CREATE INDEX idx_incidents_employer_id ON incidents(employer_id) WHERE employer_id IS NOT NULL;
    END IF;
    
    -- Index on employer_id + date
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_incidents_employer_date') THEN
        CREATE INDEX idx_incidents_employer_date ON incidents(employer_id, date_of_injury DESC) WHERE employer_id IS NOT NULL;
    END IF;
    
    -- Index on status
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_incidents_status') THEN
        CREATE INDEX idx_incidents_status ON incidents(incident_status) WHERE incident_status IS NOT NULL;
    END IF;
    
    -- Index on classification
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_incidents_classification') THEN
        CREATE INDEX idx_incidents_classification ON incidents(classification) WHERE classification IS NOT NULL;
    END IF;
END $$;

-- =====================================================
-- PART 3: Test the Fixed Function
-- =====================================================
-- Test 1: Basic query test
SELECT 'Test 1: Basic Query' as test_name, COUNT(*) as count
FROM get_incidents_with_details_rbac(10, 0, NULL, NULL, NULL, NULL, 1, NULL);

-- Test 2: Verify data types
SELECT 
    'Test 2: Data Types' as test_name,
    pg_typeof(incident_number) as incident_number_type,
    pg_typeof(worker_occupation) as worker_occupation_type,
    pg_typeof(employer_name) as employer_name_type,
    pg_typeof(site_name) as site_name_type,
    pg_typeof(department_name) as department_name_type
FROM get_incidents_with_details_rbac(1, 0, NULL, NULL, NULL, NULL, 1, NULL)
LIMIT 1;

-- Test 3: Performance check
EXPLAIN (ANALYZE, BUFFERS, TIMING ON)
SELECT * FROM get_incidents_with_details_rbac(50, 0, 8, NULL, NULL, NULL, 5, 8);
