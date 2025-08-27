-- Performance Optimization Migration - Schema Corrected
-- Fixes 5+ minute load times by adding critical indexes and optimizing functions
-- Date: 2025-08-28
-- Priority: CRITICAL

-- ============================================================================
-- PART 1: CREATE CRITICAL PERFORMANCE INDEXES
-- ============================================================================

-- Index for incidents table - speeds up employer-based queries
CREATE INDEX IF NOT EXISTS idx_incidents_employer_id 
ON public.incidents(employer_id)
WHERE employer_id IS NOT NULL;

-- Composite index for date-based queries with employer filtering
CREATE INDEX IF NOT EXISTS idx_incidents_employer_date
ON public.incidents(employer_id, date_of_injury DESC)
WHERE employer_id IS NOT NULL;

-- Index for incident status filtering
CREATE INDEX IF NOT EXISTS idx_incidents_incident_status
ON public.incidents(incident_status)
WHERE incident_status IS NOT NULL;

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_incidents_date_of_injury
ON public.incidents(date_of_injury DESC);

-- Index for worker lookups
CREATE INDEX IF NOT EXISTS idx_incidents_worker_id
ON public.incidents(worker_id)
WHERE worker_id IS NOT NULL;

-- Index for site lookups
CREATE INDEX IF NOT EXISTS idx_incidents_site_id
ON public.incidents(site_id)
WHERE site_id IS NOT NULL;

-- Index for users table - speeds up Clerk user lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id
ON public.users(clerk_user_id)
WHERE clerk_user_id IS NOT NULL;

-- Index for user role filtering
CREATE INDEX IF NOT EXISTS idx_users_role_id
ON public.users(role_id);

-- Index for user_employers junction table
CREATE INDEX IF NOT EXISTS idx_user_employers_user_id
ON public.user_employers(user_id);

CREATE INDEX IF NOT EXISTS idx_user_employers_employer_id
ON public.user_employers(employer_id);

-- Composite index for user-employer lookups
CREATE INDEX IF NOT EXISTS idx_user_employers_user_employer
ON public.user_employers(user_id, employer_id);

-- Index for primary employer lookups
CREATE INDEX IF NOT EXISTS idx_user_employers_primary
ON public.user_employers(user_id, is_primary)
WHERE is_primary = true;

-- Index for workers table - speeds up worker lookups
CREATE INDEX IF NOT EXISTS idx_workers_employer_id
ON public.workers(employer_id)
WHERE employer_id IS NOT NULL;

-- Index for worker name searches (using CORRECT column names)
CREATE INDEX IF NOT EXISTS idx_workers_given_name
ON public.workers(given_name);

CREATE INDEX IF NOT EXISTS idx_workers_family_name
ON public.workers(family_name);

-- Index for sites table - speeds up site lookups
CREATE INDEX IF NOT EXISTS idx_sites_employer_id
ON public.sites(employer_id)
WHERE employer_id IS NOT NULL;

-- Index for employers table (using CORRECT column name)
CREATE INDEX IF NOT EXISTS idx_employers_employer_name
ON public.employers(employer_name);

-- Index for employer state filtering
CREATE INDEX IF NOT EXISTS idx_employers_state
ON public.employers(employer_state);

-- ============================================================================
-- PART 2: CREATE OPTIMIZED RBAC FUNCTION WITH PAGINATION
-- ============================================================================

DROP FUNCTION IF EXISTS get_incidents_with_details_rbac_optimized;

CREATE OR REPLACE FUNCTION public.get_incidents_with_details_rbac_optimized(
  p_user_id uuid,
  p_employer_id integer DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  incident_id integer,
  date_of_injury date,
  time_of_injury time,
  date_reported date,
  incident_status text,
  estimated_cost numeric,
  psychosocial_factors jsonb,
  employer_id integer,
  employer_name text,
  worker_id integer,
  worker_name text,
  site_id integer,
  site_name text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id integer;
  v_has_all_access boolean := false;
BEGIN
  -- Get user's role
  SELECT u.role_id INTO v_role_id
  FROM users u
  WHERE u.clerk_user_id = p_user_id::text;

  -- Check if user has all-company access (Super Admin or Account Manager)
  v_has_all_access := (v_role_id IN (1, 2));

  RETURN QUERY
  WITH user_companies AS (
    -- Get user's associated companies efficiently
    SELECT ue.employer_id
    FROM user_employers ue
    WHERE ue.user_id = p_user_id
      AND (p_employer_id IS NULL OR ue.employer_id = p_employer_id)
  )
  SELECT DISTINCT
    i.incident_id,
    i.date_of_injury,
    i.time_of_injury,
    i.date_reported,
    i.incident_status,
    i.estimated_cost,
    i.psychosocial_factors,
    i.employer_id,
    e.employer_name,  -- CORRECT: using employer_name
    i.worker_id,
    CASE 
      WHEN w.worker_id IS NOT NULL 
      THEN CONCAT(w.given_name, ' ', w.family_name)  -- CORRECT: using given_name and family_name
      ELSE NULL 
    END AS worker_name,
    i.site_id,
    s.site_name,
    i.created_at,
    i.updated_at
  FROM incidents i
  LEFT JOIN employers e ON i.employer_id = e.employer_id
  LEFT JOIN workers w ON i.worker_id = w.worker_id
  LEFT JOIN sites s ON i.site_id = s.site_id
  WHERE 
    -- Super Admin or Account Manager can see all
    v_has_all_access = true
    OR
    -- Others see only their associated companies
    (v_has_all_access = false AND i.employer_id IN (SELECT employer_id FROM user_companies))
  ORDER BY i.date_of_injury DESC, i.incident_id DESC
  LIMIT p_limit
  OFFSET p_offset;

END;
$$;

-- ============================================================================
-- PART 3: CREATE LIGHTWEIGHT METRICS FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS get_incidents_metrics_rbac;

CREATE OR REPLACE FUNCTION public.get_incidents_metrics_rbac(
  p_user_id uuid,
  p_employer_id integer DEFAULT NULL
)
RETURNS TABLE (
  total_incidents bigint,
  open_incidents bigint,
  closed_incidents bigint,
  total_cost numeric,
  psychosocial_count bigint,
  recent_incidents bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id integer;
  v_has_all_access boolean := false;
BEGIN
  -- Get user's role
  SELECT u.role_id INTO v_role_id
  FROM users u
  WHERE u.clerk_user_id = p_user_id::text;

  -- Check if user has all-company access
  v_has_all_access := (v_role_id IN (1, 2));

  RETURN QUERY
  WITH user_companies AS (
    SELECT ue.employer_id
    FROM user_employers ue
    WHERE ue.user_id = p_user_id
      AND (p_employer_id IS NULL OR ue.employer_id = p_employer_id)
  ),
  filtered_incidents AS (
    SELECT 
      i.incident_id,
      i.incident_status,
      i.estimated_cost,
      i.psychosocial_factors,
      i.date_of_injury
    FROM incidents i
    WHERE 
      v_has_all_access = true
      OR
      (v_has_all_access = false AND i.employer_id IN (SELECT employer_id FROM user_companies))
  )
  SELECT 
    COUNT(*)::bigint AS total_incidents,
    COUNT(*) FILTER (WHERE incident_status IN ('Open', 'In Progress'))::bigint AS open_incidents,
    COUNT(*) FILTER (WHERE incident_status = 'Closed')::bigint AS closed_incidents,
    COALESCE(SUM(estimated_cost), 0)::numeric AS total_cost,
    COUNT(*) FILTER (WHERE psychosocial_factors IS NOT NULL AND psychosocial_factors != '[]'::jsonb)::bigint AS psychosocial_count,
    COUNT(*) FILTER (WHERE date_of_injury >= CURRENT_DATE - INTERVAL '30 days')::bigint AS recent_incidents
  FROM filtered_incidents;

END;
$$;

-- ============================================================================
-- PART 4: CREATE OPTIMIZED COUNT FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS get_incidents_count_rbac_optimized;

CREATE OR REPLACE FUNCTION public.get_incidents_count_rbac_optimized(
  p_user_id uuid,
  p_employer_id integer DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id integer;
  v_count bigint;
  v_has_all_access boolean := false;
BEGIN
  -- Get user's role
  SELECT u.role_id INTO v_role_id
  FROM users u
  WHERE u.clerk_user_id = p_user_id::text;

  -- Check if user has all-company access
  v_has_all_access := (v_role_id IN (1, 2));

  IF v_has_all_access THEN
    -- Super Admin or Account Manager: count all incidents
    SELECT COUNT(*)
    INTO v_count
    FROM incidents i
    WHERE p_employer_id IS NULL OR i.employer_id = p_employer_id;
  ELSE
    -- Other roles: count only their associated companies' incidents
    WITH user_companies AS (
      SELECT ue.employer_id
      FROM user_employers ue
      WHERE ue.user_id = p_user_id
        AND (p_employer_id IS NULL OR ue.employer_id = p_employer_id)
    )
    SELECT COUNT(*)
    INTO v_count
    FROM incidents i
    WHERE i.employer_id IN (SELECT employer_id FROM user_companies);
  END IF;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- ============================================================================
-- PART 5: CREATE EMPLOYER STATISTICS FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS get_employer_statistics;

CREATE OR REPLACE FUNCTION public.get_employer_statistics(
  p_employer_id integer DEFAULT NULL
)
RETURNS TABLE (
  employer_id integer,
  employer_name text,
  total_incidents bigint,
  open_incidents bigint,
  total_workers bigint,
  total_sites bigint,
  estimated_costs numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.employer_id,
    e.employer_name,  -- CORRECT: using employer_name
    COUNT(DISTINCT i.incident_id)::bigint AS total_incidents,
    COUNT(DISTINCT i.incident_id) FILTER (WHERE i.incident_status IN ('Open', 'In Progress'))::bigint AS open_incidents,
    COUNT(DISTINCT w.worker_id)::bigint AS total_workers,
    COUNT(DISTINCT s.site_id)::bigint AS total_sites,
    COALESCE(SUM(i.estimated_cost), 0)::numeric AS estimated_costs
  FROM employers e
  LEFT JOIN incidents i ON e.employer_id = i.employer_id
  LEFT JOIN workers w ON e.employer_id = w.employer_id
  LEFT JOIN sites s ON e.employer_id = s.employer_id
  WHERE p_employer_id IS NULL OR e.employer_id = p_employer_id
  GROUP BY e.employer_id, e.employer_name
  ORDER BY e.employer_name;
END;
$$;

-- ============================================================================
-- PART 6: ANALYZE TABLES FOR QUERY OPTIMIZATION
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE incidents;
ANALYZE users;
ANALYZE user_employers;
ANALYZE workers;
ANALYZE sites;
ANALYZE employers;

-- ============================================================================
-- PART 7: GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_incidents_with_details_rbac_optimized TO anon;
GRANT EXECUTE ON FUNCTION get_incidents_with_details_rbac_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION get_incidents_metrics_rbac TO anon;
GRANT EXECUTE ON FUNCTION get_incidents_metrics_rbac TO authenticated;
GRANT EXECUTE ON FUNCTION get_incidents_count_rbac_optimized TO anon;
GRANT EXECUTE ON FUNCTION get_incidents_count_rbac_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION get_employer_statistics TO anon;
GRANT EXECUTE ON FUNCTION get_employer_statistics TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- To verify indexes were created, run:
-- SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- To test performance improvement, run:
-- EXPLAIN ANALYZE SELECT * FROM get_incidents_with_details_rbac_optimized('your-user-uuid'::uuid, NULL, 50, 0);

-- Expected result: Query time should be <100ms instead of 5+ minutes