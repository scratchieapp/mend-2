-- Performance Optimization Migration
-- Date: 2025-08-26
-- Purpose: Optimize database performance for builder dashboard and incident queries

-- ============================================
-- 1. CREATE INDEXES FOR BETTER QUERY PERFORMANCE
-- ============================================

-- Index for employer context lookups
CREATE INDEX IF NOT EXISTS idx_user_session_contexts_user_employer 
ON user_session_contexts(user_id, selected_employer_id);

-- Composite indexes for incident queries with employer filtering
CREATE INDEX IF NOT EXISTS idx_incidents_employer_date 
ON incidents(employer_id, date_of_injury DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_employer_status 
ON incidents(employer_id, incident_status, date_of_injury DESC);

-- Index for worker lookups
CREATE INDEX IF NOT EXISTS idx_workers_employer 
ON workers(employer_id);

-- Index for sites lookups
CREATE INDEX IF NOT EXISTS idx_sites_employer 
ON sites(employer_id);

-- Index for incident documents count
CREATE INDEX IF NOT EXISTS idx_incident_documents_incident 
ON incident_documents(incident_id);

-- ============================================
-- 2. OPTIMIZED STATISTICS FUNCTION WITH CACHING
-- ============================================

-- Drop the old function first
DROP FUNCTION IF EXISTS get_employer_statistics();

-- Create optimized statistics function
CREATE OR REPLACE FUNCTION get_employer_statistics()
RETURNS TABLE (
  incident_count BIGINT,
  worker_count BIGINT,
  site_count BIGINT,
  active_lti_count BIGINT,
  selected_employer_id INTEGER,
  selected_employer_name TEXT,
  avg_days_lost NUMERIC,
  total_days_lost BIGINT,
  incidents_this_month BIGINT,
  incidents_last_month BIGINT,
  open_incidents BIGINT,
  closed_incidents BIGINT
) AS $$
DECLARE
  v_employer_id INTEGER;
  v_current_month_start DATE;
  v_last_month_start DATE;
  v_last_month_end DATE;
BEGIN
  -- Get the employer context
  v_employer_id := get_employer_context();
  
  -- Return empty if no context
  IF v_employer_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate date ranges
  v_current_month_start := date_trunc('month', CURRENT_DATE);
  v_last_month_start := date_trunc('month', CURRENT_DATE - INTERVAL '1 month');
  v_last_month_end := date_trunc('month', CURRENT_DATE) - INTERVAL '1 day';
  
  -- Return aggregated statistics in a single query for better performance
  RETURN QUERY
  WITH employer_stats AS (
    SELECT 
      e.employer_id,
      e.employer_name
    FROM employers e
    WHERE e.employer_id = v_employer_id
  ),
  incident_stats AS (
    SELECT 
      COUNT(*) AS total_incidents,
      COUNT(*) FILTER (WHERE injury_type = 'LTI' AND incident_status != 'Closed') AS active_lti,
      AVG(total_days_lost) AS avg_days,
      SUM(total_days_lost) AS total_days,
      COUNT(*) FILTER (WHERE date_of_injury >= v_current_month_start) AS this_month,
      COUNT(*) FILTER (WHERE date_of_injury >= v_last_month_start AND date_of_injury <= v_last_month_end) AS last_month,
      COUNT(*) FILTER (WHERE incident_status = 'Open' OR incident_status IS NULL) AS open_count,
      COUNT(*) FILTER (WHERE incident_status = 'Closed') AS closed_count
    FROM incidents
    WHERE employer_id = v_employer_id
  ),
  worker_stats AS (
    SELECT COUNT(*) AS worker_count
    FROM workers
    WHERE employer_id = v_employer_id
  ),
  site_stats AS (
    SELECT COUNT(*) AS site_count
    FROM sites
    WHERE employer_id = v_employer_id
  )
  SELECT 
    COALESCE(i.total_incidents, 0)::BIGINT,
    COALESCE(w.worker_count, 0)::BIGINT,
    COALESCE(s.site_count, 0)::BIGINT,
    COALESCE(i.active_lti, 0)::BIGINT,
    e.employer_id,
    e.employer_name::TEXT,
    ROUND(COALESCE(i.avg_days, 0), 2)::NUMERIC,
    COALESCE(i.total_days, 0)::BIGINT,
    COALESCE(i.this_month, 0)::BIGINT,
    COALESCE(i.last_month, 0)::BIGINT,
    COALESCE(i.open_count, 0)::BIGINT,
    COALESCE(i.closed_count, 0)::BIGINT
  FROM employer_stats e
  CROSS JOIN incident_stats i
  CROSS JOIN worker_stats w
  CROSS JOIN site_stats s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 3. OPTIMIZED INCIDENT DETAILS FUNCTION
-- ============================================

-- Drop old function
DROP FUNCTION IF EXISTS get_incidents_with_details(INTEGER, INTEGER, INTEGER, INTEGER, DATE, DATE, INTEGER, INTEGER);

-- Create optimized version with better joins and filtering
CREATE OR REPLACE FUNCTION get_incidents_with_details(
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
  incident_number TEXT,
  date_of_injury DATE,
  time_of_injury TIME,
  injury_type TEXT,
  classification TEXT,
  injury_description TEXT,
  fatality BOOLEAN,
  returned_to_work BOOLEAN,
  total_days_lost INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  worker_id INTEGER,
  worker_first_name TEXT,
  worker_last_name TEXT,
  worker_full_name TEXT,
  worker_employee_number TEXT,
  employer_id INTEGER,
  employer_name TEXT,
  employer_abn TEXT,
  medical_professional_id INTEGER,
  medical_professional_name TEXT,
  medical_professional_specialty TEXT,
  medical_professional_phone TEXT,
  site_id INTEGER,
  site_name TEXT,
  site_location TEXT,
  department_id INTEGER,
  department_name TEXT,
  document_count BIGINT
) AS $$
DECLARE
  v_context_employer_id INTEGER;
BEGIN
  -- Get the current employer context
  v_context_employer_id := get_employer_context();
  
  RETURN QUERY
  WITH filtered_incidents AS (
    -- Pre-filter incidents for better performance
    SELECT i.*
    FROM incidents i
    WHERE 
      -- Use context employer if no filter specified
      (filter_employer_id IS NULL AND v_context_employer_id IS NOT NULL AND i.employer_id = v_context_employer_id)
      OR (filter_employer_id IS NOT NULL AND i.employer_id = filter_employer_id)
      OR (filter_employer_id IS NULL AND v_context_employer_id IS NULL AND user_role_id = 1) -- Super admin view all
      -- Apply other filters
      AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
      AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
      AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
    ORDER BY i.date_of_injury DESC, i.time_of_injury DESC
    LIMIT page_size
    OFFSET page_offset
  ),
  document_counts AS (
    -- Pre-aggregate document counts for better performance
    SELECT 
      id.incident_id AS doc_incident_id,
      COUNT(*)::BIGINT AS doc_count
    FROM incident_documents id
    WHERE id.incident_id IN (SELECT incident_id FROM filtered_incidents)
    GROUP BY id.incident_id
  )
  SELECT 
    fi.incident_id,
    fi.incident_number,
    fi.date_of_injury,
    fi.time_of_injury,
    fi.injury_type,
    fi.classification,
    fi.injury_description,
    fi.fatality,
    fi.returned_to_work,
    fi.total_days_lost,
    fi.created_at,
    fi.updated_at,
    w.worker_id,
    w.given_name::TEXT,
    w.family_name::TEXT,
    (COALESCE(w.given_name, '') || ' ' || COALESCE(w.family_name, ''))::TEXT,
    CAST(w.worker_id AS TEXT),
    e.employer_id,
    e.employer_name::TEXT,
    e.abn::TEXT,
    fi.medical_professional_id,
    NULL::TEXT,
    NULL::TEXT,
    NULL::TEXT,
    s.site_id,
    s.site_name::TEXT,
    CASE 
      WHEN s.site_id IS NOT NULL
      THEN TRIM(
        COALESCE(s.street_address || ', ', '') || 
        COALESCE(s.city || ', ', '') || 
        COALESCE(s.state || ' ', '') || 
        COALESCE(s.post_code, '')
      )::TEXT
      ELSE NULL::TEXT
    END,
    d.department_id,
    d.department_name::TEXT,
    COALESCE(dc.doc_count, 0)::BIGINT
  FROM filtered_incidents fi
  LEFT JOIN workers w ON fi.worker_id = w.worker_id
  LEFT JOIN employers e ON fi.employer_id = e.employer_id
  LEFT JOIN sites s ON fi.site_id = s.site_id
  LEFT JOIN departments d ON fi.department_id = d.department_id
  LEFT JOIN document_counts dc ON fi.incident_id = dc.doc_incident_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 4. OPTIMIZED INCIDENT COUNT FUNCTION
-- ============================================

-- Drop old function
DROP FUNCTION IF EXISTS get_incidents_count(INTEGER, INTEGER, DATE, DATE, INTEGER, INTEGER);

-- Create optimized count function
CREATE OR REPLACE FUNCTION get_incidents_count(
  filter_employer_id INTEGER DEFAULT NULL,
  filter_worker_id INTEGER DEFAULT NULL,
  filter_start_date DATE DEFAULT NULL,
  filter_end_date DATE DEFAULT NULL,
  user_role_id INTEGER DEFAULT NULL,
  user_employer_id INTEGER DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  v_context_employer_id INTEGER;
  v_count BIGINT;
BEGIN
  -- Get the current employer context
  v_context_employer_id := get_employer_context();
  
  SELECT COUNT(*)::BIGINT INTO v_count
  FROM incidents i
  WHERE 
    -- Use context employer if no filter specified
    (filter_employer_id IS NULL AND v_context_employer_id IS NOT NULL AND i.employer_id = v_context_employer_id)
    OR (filter_employer_id IS NOT NULL AND i.employer_id = filter_employer_id)
    OR (filter_employer_id IS NULL AND v_context_employer_id IS NULL AND user_role_id = 1) -- Super admin view all
    -- Apply other filters
    AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
    AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
    AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date);
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 5. CREATE MATERIALIZED VIEW FOR DASHBOARD METRICS
-- ============================================

-- Create a materialized view for faster dashboard loading
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_employer_metrics AS
SELECT 
  e.employer_id,
  e.employer_name,
  COUNT(DISTINCT i.incident_id) AS total_incidents,
  COUNT(DISTINCT i.incident_id) FILTER (WHERE i.injury_type = 'LTI') AS lti_incidents,
  COUNT(DISTINCT i.incident_id) FILTER (WHERE i.fatality = true) AS fatality_incidents,
  COUNT(DISTINCT w.worker_id) AS total_workers,
  COUNT(DISTINCT s.site_id) AS total_sites,
  AVG(i.total_days_lost) AS avg_days_lost,
  SUM(i.total_days_lost) AS total_days_lost,
  MAX(i.date_of_injury) AS last_incident_date,
  COUNT(DISTINCT i.incident_id) FILTER (WHERE i.date_of_injury >= CURRENT_DATE - INTERVAL '30 days') AS incidents_last_30_days,
  COUNT(DISTINCT i.incident_id) FILTER (WHERE i.date_of_injury >= CURRENT_DATE - INTERVAL '7 days') AS incidents_last_7_days
FROM employers e
LEFT JOIN incidents i ON e.employer_id = i.employer_id
LEFT JOIN workers w ON e.employer_id = w.employer_id
LEFT JOIN sites s ON e.employer_id = s.employer_id
GROUP BY e.employer_id, e.employer_name;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_employer_metrics_employer_id 
ON mv_employer_metrics(employer_id);

-- ============================================
-- 6. CREATE FUNCTION TO REFRESH MATERIALIZED VIEW
-- ============================================

CREATE OR REPLACE FUNCTION refresh_employer_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_employer_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

-- Grant permissions on new functions
GRANT EXECUTE ON FUNCTION get_employer_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_incidents_with_details(INTEGER, INTEGER, INTEGER, INTEGER, DATE, DATE, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_incidents_count(INTEGER, INTEGER, DATE, DATE, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_employer_metrics() TO authenticated;

-- Grant permissions on materialized view
GRANT SELECT ON mv_employer_metrics TO authenticated;

-- ============================================
-- 8. ANALYZE TABLES FOR QUERY OPTIMIZER
-- ============================================

-- Update table statistics for better query planning
ANALYZE incidents;
ANALYZE workers;
ANALYZE sites;
ANALYZE employers;
ANALYZE departments;
ANALYZE incident_documents;
ANALYZE user_session_contexts;

-- ============================================
-- 9. ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION get_employer_statistics() IS 'Optimized function to get comprehensive employer statistics with improved performance';
COMMENT ON FUNCTION get_incidents_with_details(INTEGER, INTEGER, INTEGER, INTEGER, DATE, DATE, INTEGER, INTEGER) IS 'Optimized function to fetch paginated incident details with better query performance';
COMMENT ON FUNCTION get_incidents_count(INTEGER, INTEGER, DATE, DATE, INTEGER, INTEGER) IS 'Optimized function to count incidents with filters';
COMMENT ON MATERIALIZED VIEW mv_employer_metrics IS 'Pre-aggregated employer metrics for fast dashboard loading';
COMMENT ON FUNCTION refresh_employer_metrics() IS 'Refreshes the employer metrics materialized view';