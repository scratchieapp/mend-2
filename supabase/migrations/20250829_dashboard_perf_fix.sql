-- =====================================================
-- Dashboard Performance Fix: Combined RPC + Critical Indexes
-- Date: 2025-08-29
-- Purpose: Ensure /dashboard loads quickly by
--  1) providing a single RPC (get_dashboard_data) that returns incidents + count
--  2) creating essential indexes used by dashboard filters
-- =====================================================

-- 1) Create/replace combined RPC returning incidents + count in one call
DROP FUNCTION IF EXISTS public.get_dashboard_data(
  INTEGER, INTEGER, INTEGER, INTEGER, DATE, DATE, INTEGER, INTEGER
) CASCADE;

CREATE OR REPLACE FUNCTION public.get_dashboard_data(
    page_size INTEGER DEFAULT 50,
    page_offset INTEGER DEFAULT 0,
    filter_employer_id INTEGER DEFAULT NULL,
    filter_worker_id INTEGER DEFAULT NULL,
    filter_start_date DATE DEFAULT NULL,
    filter_end_date DATE DEFAULT NULL,
    user_role_id INTEGER DEFAULT NULL,
    user_employer_id INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
    WITH incident_data AS (
        SELECT 
            i.incident_id,
            COALESCE(i.incident_number, '')::VARCHAR as incident_number,
            i.date_of_injury,
            i.time_of_injury,
            COALESCE(i.injury_type, '')::VARCHAR as injury_type,
            COALESCE(i.classification, '')::VARCHAR as classification,
            COALESCE(i.incident_status, 'Open')::VARCHAR as incident_status,
            COALESCE(i.injury_description, '')::TEXT as injury_description,
            COALESCE(i.fatality, false) as fatality,
            COALESCE(i.returned_to_work, false) as returned_to_work,
            COALESCE(i.total_days_lost, 0) as total_days_lost,
            i.created_at,
            i.updated_at,
            i.worker_id,
            COALESCE(w.given_name || ' ' || w.family_name, 'Unknown Worker')::TEXT as worker_name,
            COALESCE(w.occupation, '')::VARCHAR as worker_occupation,
            i.employer_id,
            COALESCE(e.employer_name, '')::VARCHAR as employer_name,
            i.site_id,
            COALESCE(s.site_name, '')::VARCHAR as site_name,
            i.department_id,
            COALESCE(d.department_name, '')::VARCHAR as department_name,
            0::BIGINT as document_count,
            i.estimated_cost,
            i.psychosocial_factors
        FROM incidents i
        INNER JOIN employers e ON i.employer_id = e.employer_id
        LEFT JOIN workers w ON i.worker_id = w.worker_id
        LEFT JOIN sites s ON i.site_id = s.site_id
        LEFT JOIN departments d ON i.department_id = d.department_id
        WHERE 
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
    ),
    total_count AS (
        SELECT COUNT(*) as count
        FROM incidents i
        WHERE 
            CASE 
                WHEN user_role_id IN (1, 2, 3, 4) AND filter_employer_id IS NULL THEN true
                WHEN user_role_id IN (1, 2, 3, 4) AND filter_employer_id IS NOT NULL THEN i.employer_id = filter_employer_id
                WHEN user_role_id NOT IN (1, 2, 3, 4) THEN i.employer_id = COALESCE(filter_employer_id, user_employer_id)
                ELSE false
            END
            AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
            AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
            AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    )
    SELECT json_build_object(
        'incidents', COALESCE(json_agg(incident_data.*), '[]'::json),
        'totalCount', (SELECT count FROM total_count),
        'pageSize', page_size,
        'pageOffset', page_offset
    )
    FROM (
        SELECT * FROM incident_data
        LIMIT page_size
        OFFSET page_offset
    ) incident_data;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_data TO anon;

-- 2) Ensure essential indexes exist (safe, concurrent, idempotent)
-- incidents table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_employer_id 
  ON incidents(employer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_status 
  ON incidents(incident_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_date_of_injury 
  ON incidents(date_of_injury);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_employer_status_date 
  ON incidents(employer_id, incident_status, date_of_injury);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_worker_id 
  ON incidents(worker_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_site_id 
  ON incidents(site_id);

-- user_employers and users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_employers_user_id 
  ON user_employers(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_employers_employer_id 
  ON user_employers(employer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_id 
  ON users(role_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_employer_id 
  ON users(employer_id);

-- Optional but useful for metrics/costs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_estimated_cost 
  ON incidents(estimated_cost) 
  WHERE estimated_cost IS NOT NULL;

-- JSONB performance (only if used in filters/metrics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_psychosocial_factors_gin 
  ON incidents USING GIN(psychosocial_factors) 
  WHERE psychosocial_factors IS NOT NULL;

-- 3) Quick sanity check queries (safe to keep as comments)
-- SELECT get_dashboard_data(50, 0, NULL, NULL, NULL, NULL, 1, NULL);
-- EXPLAIN (ANALYZE, TIMING ON)
-- SELECT get_dashboard_data(50, 0, NULL, NULL, NULL, NULL, 1, NULL);


