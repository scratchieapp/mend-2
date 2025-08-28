-- =====================================================
-- CRITICAL PERFORMANCE FIX - APPLY IMMEDIATELY
-- =====================================================
-- This fixes the 5-10 minute load time issue
-- Error: "column i.total_claim_cost does not exist"
-- Solution: Create missing function with correct column names

-- Drop any existing version of the function
DROP FUNCTION IF EXISTS public.get_incident_metrics_rbac CASCADE;

-- Create the function that the frontend is expecting
CREATE OR REPLACE FUNCTION public.get_incident_metrics_rbac(
  user_role_id integer DEFAULT NULL,
  user_employer_id integer DEFAULT NULL,
  filter_employer_id integer DEFAULT NULL,
  filter_start_date date DEFAULT NULL,
  filter_end_date date DEFAULT NULL
)
RETURNS TABLE (
  total_incidents bigint,
  avg_lost_time numeric,
  total_lost_days numeric,
  total_claim_costs numeric,
  psychosocial_count bigint,
  fatality_count bigint,
  lti_count bigint,
  mti_count bigint,
  fai_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
PARALLEL SAFE
AS $$
DECLARE
  v_has_all_access boolean := false;
BEGIN
  -- Check if user has all-company access (Super Admin or MEND staff)
  v_has_all_access := (user_role_id IN (1, 2, 3, 4));

  RETURN QUERY
  WITH filtered_incidents AS (
    SELECT 
      i.*
    FROM incidents i
    WHERE 
      -- Date filtering
      (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
      AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
      AND (
        -- Super Admin / MEND Staff see everything or filtered by employer
        (v_has_all_access = true AND (filter_employer_id IS NULL OR i.employer_id = filter_employer_id))
        OR
        -- Other roles see only their employer's data
        (v_has_all_access = false AND user_employer_id IS NOT NULL AND i.employer_id = user_employer_id)
      )
  )
  SELECT 
    COUNT(*)::bigint AS total_incidents,
    COALESCE(AVG(CASE WHEN total_days_lost > 0 THEN total_days_lost ELSE NULL END), 0)::numeric AS avg_lost_time,
    COALESCE(SUM(total_days_lost), 0)::numeric AS total_lost_days,
    -- CRITICAL FIX: Use estimated_cost instead of non-existent total_claim_cost
    COALESCE(SUM(estimated_cost), 0)::numeric AS total_claim_costs,
    COUNT(*) FILTER (
      WHERE psychosocial_factors IS NOT NULL 
      AND jsonb_typeof(psychosocial_factors) = 'object'
      AND psychosocial_factors::text != '{}'
    )::bigint AS psychosocial_count,
    COUNT(*) FILTER (WHERE fatality = true)::bigint AS fatality_count,
    COUNT(*) FILTER (WHERE classification = 'LTI')::bigint AS lti_count,
    COUNT(*) FILTER (WHERE classification = 'MTI')::bigint AS mti_count,
    COUNT(*) FILTER (WHERE classification = 'FAI')::bigint AS fai_count
  FROM filtered_incidents;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_incident_metrics_rbac TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incident_metrics_rbac TO anon;

-- Create indexes if they don't exist for optimal performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_employer_date 
  ON incidents(employer_id, date_of_injury DESC)
  WHERE employer_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_classification 
  ON incidents(classification)
  WHERE classification IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_fatality 
  ON incidents(fatality)
  WHERE fatality = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_estimated_cost 
  ON incidents(estimated_cost)
  WHERE estimated_cost IS NOT NULL AND estimated_cost > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_psychosocial_gin 
  ON incidents USING GIN(psychosocial_factors) 
  WHERE psychosocial_factors IS NOT NULL;

-- Verify the function works
SELECT * FROM get_incident_metrics_rbac(1, NULL, NULL, NULL, NULL);