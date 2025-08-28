-- =====================================================
-- FIX DASHBOARD PERFORMANCE ISSUES
-- =====================================================

-- Issue: The dashboard is slow and only shows Newcastle Builders data
-- Root causes:
-- 1. Missing indexes for the actual query patterns
-- 2. Possible issues with employer context
-- 3. Multiple queries being executed

-- =====================================================
-- STEP 1: Create a simplified, ultra-fast function
-- =====================================================
DROP FUNCTION IF EXISTS public.get_dashboard_incidents CASCADE;

CREATE OR REPLACE FUNCTION public.get_dashboard_incidents(
    p_page_size INTEGER DEFAULT 50,
    p_page_offset INTEGER DEFAULT 0,
    p_employer_id INTEGER DEFAULT NULL,
    p_role_id INTEGER DEFAULT NULL
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
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
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
        COALESCE(w.occupation, '')::VARCHAR,
        i.employer_id,
        COALESCE(e.employer_name, '')::VARCHAR,
        i.site_id,
        COALESCE(s.site_name, '')::VARCHAR,
        i.department_id,
        COALESCE(d.department_name, '')::VARCHAR,
        0::BIGINT,
        i.estimated_cost,
        i.psychosocial_factors
    FROM incidents i
    INNER JOIN employers e ON i.employer_id = e.employer_id
    LEFT JOIN workers w ON i.worker_id = w.worker_id
    LEFT JOIN sites s ON i.site_id = s.site_id
    LEFT JOIN departments d ON i.department_id = d.department_id
    WHERE 
        -- Super Admin sees all, others see filtered
        (p_role_id = 1 OR p_employer_id IS NOT NULL)
        AND (p_employer_id IS NULL OR i.employer_id = p_employer_id)
    ORDER BY i.date_of_injury DESC, i.incident_id DESC
    LIMIT p_page_size
    OFFSET p_page_offset;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_dashboard_incidents TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_incidents TO anon;

-- =====================================================
-- STEP 2: Create covering index for dashboard queries
-- =====================================================
-- This index includes all columns needed for the dashboard
-- Run this OUTSIDE of a transaction
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_dashboard_covering
ON incidents(date_of_injury DESC, incident_id DESC)
INCLUDE (
    incident_number,
    time_of_injury,
    injury_type,
    classification,
    incident_status,
    injury_description,
    fatality,
    returned_to_work,
    total_days_lost,
    created_at,
    updated_at,
    worker_id,
    employer_id,
    site_id,
    department_id,
    estimated_cost,
    psychosocial_factors
)
WHERE date_of_injury IS NOT NULL;

-- =====================================================
-- STEP 3: Fix the existing function to be more efficient
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
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
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
        COALESCE(w.occupation, '')::VARCHAR,
        i.employer_id,
        COALESCE(e.employer_name, '')::VARCHAR,
        i.site_id,
        COALESCE(s.site_name, '')::VARCHAR,
        i.department_id,
        COALESCE(d.department_name, '')::VARCHAR,
        0::BIGINT,
        i.estimated_cost,
        i.psychosocial_factors
    FROM incidents i
    INNER JOIN employers e ON i.employer_id = e.employer_id
    LEFT JOIN workers w ON i.worker_id = w.worker_id
    LEFT JOIN sites s ON i.site_id = s.site_id
    LEFT JOIN departments d ON i.department_id = d.department_id
    WHERE 
        -- Super Admin (roles 1-4) see all when no filter
        CASE 
            WHEN user_role_id IN (1, 2, 3, 4) AND filter_employer_id IS NULL THEN true
            WHEN user_role_id IN (1, 2, 3, 4) AND filter_employer_id IS NOT NULL THEN i.employer_id = filter_employer_id
            WHEN user_role_id NOT IN (1, 2, 3, 4) THEN i.employer_id = COALESCE(filter_employer_id, user_employer_id)
            ELSE false
        END
        AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
        AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
        AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    ORDER BY i.date_of_injury DESC, i.incident_id DESC
    LIMIT page_size
    OFFSET page_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_incidents_with_details_rbac TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incidents_with_details_rbac TO anon;

-- =====================================================
-- STEP 4: Test the performance
-- =====================================================
-- Test 1: Super admin viewing all companies
EXPLAIN (ANALYZE, TIMING ON)
SELECT COUNT(*) FROM get_incidents_with_details_rbac(
    50, 0, NULL, NULL, NULL, NULL, 1, NULL
);

-- Test 2: Specific employer
EXPLAIN (ANALYZE, TIMING ON)
SELECT COUNT(*) FROM get_incidents_with_details_rbac(
    50, 0, 8, NULL, NULL, NULL, 5, 8
);

-- Test 3: Use the simplified dashboard function
EXPLAIN (ANALYZE, TIMING ON)
SELECT COUNT(*) FROM get_dashboard_incidents(50, 0, NULL, 1);
