-- =====================================================
-- WORKING PERFORMANCE FIX - VERIFIED SCHEMA
-- =====================================================
-- This migration uses the ACTUAL database schema to create
-- proper indexes and optimized functions for <1 second load times
-- Target: Both "all companies" and filtered queries should be <1 second

-- =====================================================
-- PART 1: DROP EXISTING OBJECTS (CLEAN SLATE)
-- =====================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_incidents_with_details_optimized CASCADE;
DROP FUNCTION IF EXISTS get_incidents_count_optimized CASCADE;
DROP FUNCTION IF EXISTS get_employer_metrics_optimized CASCADE;

-- Drop any existing indexes that might conflict
DROP INDEX IF EXISTS idx_incidents_employer_date;
DROP INDEX IF EXISTS idx_incidents_worker_lookup;
DROP INDEX IF EXISTS idx_incidents_site_lookup;
DROP INDEX IF EXISTS idx_incidents_dept_lookup;
DROP INDEX IF EXISTS idx_incidents_doctor_lookup;
DROP INDEX IF EXISTS idx_workers_employer_name;
DROP INDEX IF EXISTS idx_workers_occupation;
DROP INDEX IF EXISTS idx_sites_employer_name;
DROP INDEX IF EXISTS idx_departments_name;
DROP INDEX IF EXISTS idx_incidents_created_at;
DROP INDEX IF EXISTS idx_incidents_compound_lookup;
DROP INDEX IF EXISTS idx_incidents_employer_created;
DROP INDEX IF EXISTS idx_incidents_performance_composite;

-- =====================================================
-- PART 2: CREATE HIGH-PERFORMANCE INDEXES
-- =====================================================

-- Primary performance index for employer filtering and date sorting
CREATE INDEX IF NOT EXISTS idx_incidents_employer_created 
ON incidents(employer_id, created_at DESC) 
WHERE employer_id IS NOT NULL;

-- Composite index for the main query pattern
CREATE INDEX IF NOT EXISTS idx_incidents_performance_composite
ON incidents(employer_id, incident_id, created_at DESC)
INCLUDE (
    worker_id, 
    incident_number, 
    date_of_injury, 
    time_of_injury,
    injury_type,
    classification,
    site_id,
    department_id,
    doctor_id,
    fatality,
    returned_to_work,
    total_days_lost,
    injury_description
);

-- Foreign key lookups (these are critical for JOIN performance)
CREATE INDEX IF NOT EXISTS idx_incidents_worker_lookup 
ON incidents(worker_id) 
WHERE worker_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_site_lookup 
ON incidents(site_id) 
WHERE site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_dept_lookup 
ON incidents(department_id) 
WHERE department_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_doctor_lookup 
ON incidents(doctor_id) 
WHERE doctor_id IS NOT NULL;

-- Worker table indexes for fast JOINs
CREATE INDEX IF NOT EXISTS idx_workers_employer_name 
ON workers(employer_id, worker_id, given_name, family_name);

CREATE INDEX IF NOT EXISTS idx_workers_occupation 
ON workers(occupation) 
WHERE occupation IS NOT NULL;

-- Sites table index for fast lookups
CREATE INDEX IF NOT EXISTS idx_sites_employer_name 
ON sites(employer_id, site_id, name);

-- Departments table index
CREATE INDEX IF NOT EXISTS idx_departments_name 
ON departments(department_id, name);

-- Date-based queries index
CREATE INDEX IF NOT EXISTS idx_incidents_date_of_injury 
ON incidents(date_of_injury DESC) 
WHERE date_of_injury IS NOT NULL;

-- =====================================================
-- PART 3: CREATE OPTIMIZED RBAC FUNCTIONS
-- =====================================================

-- Main function for fetching incidents with all details
CREATE OR REPLACE FUNCTION get_incidents_with_details_optimized(
    p_user_id TEXT,
    p_employer_id INTEGER DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    incident_id INTEGER,
    incident_number TEXT,
    date_of_injury DATE,
    time_of_injury TIME,
    injury_type TEXT,
    classification TEXT,
    fatality BOOLEAN,
    returned_to_work BOOLEAN,
    total_days_lost INTEGER,
    injury_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    worker_id INTEGER,
    worker_given_name TEXT,
    worker_family_name TEXT,
    worker_occupation TEXT,
    employer_id INTEGER,
    employer_name TEXT,
    site_id INTEGER,
    site_name TEXT,
    site_location TEXT,
    department_id INTEGER,
    department_name TEXT,
    doctor_id INTEGER,
    doctor_name TEXT,
    user_role_id INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_role_id INTEGER;
    v_user_employer_id INTEGER;
BEGIN
    -- Get user's role and employer with single query
    SELECT u.role_id, u.employer_id 
    INTO v_user_role_id, v_user_employer_id
    FROM users u
    WHERE u.clerk_user_id = p_user_id
    LIMIT 1;

    -- Return empty if user not found
    IF v_user_role_id IS NULL THEN
        RETURN;
    END IF;

    -- Super Admin (role 1) or Account Manager (role 2) logic
    IF v_user_role_id IN (1, 2) THEN
        -- If employer_id provided, use it; otherwise show all
        IF p_employer_id IS NOT NULL THEN
            v_user_employer_id := p_employer_id;
        ELSE
            v_user_employer_id := NULL; -- Show all companies
        END IF;
    END IF;
    -- For other roles, they see only their employer's data

    RETURN QUERY
    WITH filtered_incidents AS (
        SELECT 
            i.incident_id,
            i.incident_number,
            i.date_of_injury,
            i.time_of_injury,
            i.injury_type,
            i.classification,
            i.fatality,
            i.returned_to_work,
            i.total_days_lost,
            i.injury_description,
            i.created_at,
            i.updated_at,
            i.worker_id,
            i.employer_id,
            i.site_id,
            i.department_id,
            i.doctor_id
        FROM incidents i
        WHERE 
            -- If v_user_employer_id is NULL (show all) or matches the employer
            (v_user_employer_id IS NULL OR i.employer_id = v_user_employer_id)
        ORDER BY i.created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT 
        fi.incident_id,
        fi.incident_number,
        fi.date_of_injury,
        fi.time_of_injury,
        fi.injury_type,
        fi.classification,
        fi.fatality,
        fi.returned_to_work,
        fi.total_days_lost,
        fi.injury_description,
        fi.created_at,
        fi.updated_at,
        fi.worker_id,
        w.given_name AS worker_given_name,
        w.family_name AS worker_family_name,
        w.occupation AS worker_occupation,
        fi.employer_id,
        e.name AS employer_name,
        fi.site_id,
        s.name AS site_name,
        s.location AS site_location,
        fi.department_id,
        d.name AS department_name,
        fi.doctor_id,
        -- Handle the doctor name gracefully (medical_professionals table is empty)
        CASE 
            WHEN mp.first_name IS NOT NULL THEN 
                CONCAT(mp.first_name, ' ', mp.last_name)
            ELSE 
                NULL
        END AS doctor_name,
        v_user_role_id AS user_role_id
    FROM filtered_incidents fi
    LEFT JOIN workers w ON w.worker_id = fi.worker_id
    LEFT JOIN employers e ON e.employer_id = fi.employer_id
    LEFT JOIN sites s ON s.site_id = fi.site_id
    LEFT JOIN departments d ON d.department_id = fi.department_id
    LEFT JOIN medical_professionals mp ON mp.medical_professional_id = fi.doctor_id;
END;
$$;

-- Optimized count function
CREATE OR REPLACE FUNCTION get_incidents_count_optimized(
    p_user_id TEXT,
    p_employer_id INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_role_id INTEGER;
    v_user_employer_id INTEGER;
    v_count INTEGER;
BEGIN
    -- Get user's role and employer
    SELECT u.role_id, u.employer_id 
    INTO v_user_role_id, v_user_employer_id
    FROM users u
    WHERE u.clerk_user_id = p_user_id
    LIMIT 1;

    -- Return 0 if user not found
    IF v_user_role_id IS NULL THEN
        RETURN 0;
    END IF;

    -- Super Admin or Account Manager logic
    IF v_user_role_id IN (1, 2) THEN
        IF p_employer_id IS NOT NULL THEN
            v_user_employer_id := p_employer_id;
        ELSE
            v_user_employer_id := NULL; -- Count all
        END IF;
    END IF;

    -- Get count based on employer filter
    IF v_user_employer_id IS NULL THEN
        -- Count all incidents
        SELECT COUNT(*)::INTEGER 
        INTO v_count
        FROM incidents;
    ELSE
        -- Count only for specific employer
        SELECT COUNT(*)::INTEGER 
        INTO v_count
        FROM incidents
        WHERE employer_id = v_user_employer_id;
    END IF;

    RETURN COALESCE(v_count, 0);
END;
$$;

-- Optimized employer metrics function
CREATE OR REPLACE FUNCTION get_employer_metrics_optimized(
    p_user_id TEXT,
    p_employer_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    total_incidents BIGINT,
    total_fatalities BIGINT,
    total_days_lost NUMERIC,
    avg_days_lost NUMERIC,
    workers_returned BIGINT,
    pending_return BIGINT,
    by_injury_type JSONB,
    by_classification JSONB,
    recent_incidents JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_role_id INTEGER;
    v_user_employer_id INTEGER;
BEGIN
    -- Get user's role and employer
    SELECT u.role_id, u.employer_id 
    INTO v_user_role_id, v_user_employer_id
    FROM users u
    WHERE u.clerk_user_id = p_user_id
    LIMIT 1;

    -- Return empty if user not found
    IF v_user_role_id IS NULL THEN
        RETURN;
    END IF;

    -- Handle role-based access
    IF v_user_role_id IN (1, 2) THEN
        IF p_employer_id IS NOT NULL THEN
            v_user_employer_id := p_employer_id;
        ELSE
            v_user_employer_id := NULL;
        END IF;
    END IF;

    RETURN QUERY
    WITH employer_incidents AS (
        SELECT * 
        FROM incidents i
        WHERE v_user_employer_id IS NULL OR i.employer_id = v_user_employer_id
    ),
    metrics AS (
        SELECT
            COUNT(*)::BIGINT AS total_incidents,
            COUNT(*) FILTER (WHERE fatality = true)::BIGINT AS total_fatalities,
            COALESCE(SUM(total_days_lost), 0) AS total_days_lost,
            COALESCE(AVG(total_days_lost), 0) AS avg_days_lost,
            COUNT(*) FILTER (WHERE returned_to_work = true)::BIGINT AS workers_returned,
            COUNT(*) FILTER (WHERE returned_to_work = false)::BIGINT AS pending_return
        FROM employer_incidents
    ),
    injury_types AS (
        SELECT jsonb_object_agg(
            COALESCE(injury_type, 'Unknown'),
            count
        ) AS by_injury_type
        FROM (
            SELECT injury_type, COUNT(*)::INTEGER AS count
            FROM employer_incidents
            GROUP BY injury_type
        ) t
    ),
    classifications AS (
        SELECT jsonb_object_agg(
            COALESCE(classification, 'Unknown'),
            count
        ) AS by_classification
        FROM (
            SELECT classification, COUNT(*)::INTEGER AS count
            FROM employer_incidents
            GROUP BY classification
        ) t
    ),
    recent AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'incident_id', incident_id,
                'incident_number', incident_number,
                'date_of_injury', date_of_injury,
                'injury_type', injury_type,
                'worker_id', worker_id
            ) ORDER BY created_at DESC
        ) AS recent_incidents
        FROM (
            SELECT incident_id, incident_number, date_of_injury, injury_type, worker_id, created_at
            FROM employer_incidents
            ORDER BY created_at DESC
            LIMIT 10
        ) r
    )
    SELECT 
        m.total_incidents,
        m.total_fatalities,
        m.total_days_lost,
        m.avg_days_lost,
        m.workers_returned,
        m.pending_return,
        COALESCE(it.by_injury_type, '{}'::jsonb),
        COALESCE(c.by_classification, '{}'::jsonb),
        COALESCE(r.recent_incidents, '[]'::jsonb)
    FROM metrics m
    CROSS JOIN injury_types it
    CROSS JOIN classifications c
    CROSS JOIN recent r;
END;
$$;

-- =====================================================
-- PART 4: ANALYZE TABLES FOR QUERY PLANNER
-- =====================================================

-- Update statistics for the query planner
ANALYZE incidents;
ANALYZE workers;
ANALYZE employers;
ANALYZE sites;
ANALYZE departments;
ANALYZE medical_professionals;
ANALYZE users;

-- =====================================================
-- PART 5: GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_incidents_with_details_optimized TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_incidents_count_optimized TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_employer_metrics_optimized TO anon, authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- After running this migration, test with these queries:

-- Test 1: Get all incidents for Super Admin (should be <1 second)
-- SELECT * FROM get_incidents_with_details_optimized('your-clerk-id', NULL, 100, 0);

-- Test 2: Get Newcastle Builders incidents (employer_id = 8, should be <1 second)
-- SELECT * FROM get_incidents_with_details_optimized('your-clerk-id', 8, 100, 0);

-- Test 3: Get incident count
-- SELECT get_incidents_count_optimized('your-clerk-id', NULL);

-- Test 4: Check query plan for performance
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT * FROM get_incidents_with_details_optimized('your-clerk-id', 8, 100, 0);

-- =====================================================
-- EXPECTED RESULTS
-- =====================================================
-- 1. All queries should execute in <1 second
-- 2. The EXPLAIN ANALYZE should show index scans, not sequential scans
-- 3. No 42703 errors (column does not exist)
-- 4. Proper data returned with correct worker names (given_name, family_name)
-- 5. Sites and departments properly joined with correct column names