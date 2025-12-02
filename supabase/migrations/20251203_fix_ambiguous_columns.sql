-- Fix ambiguous column reference in get_employer_statistics_direct
-- The column 'total_days_lost' was ambiguous between the RETURNS TABLE column and incidents table column

DROP FUNCTION IF EXISTS get_employer_statistics_direct(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_employer_statistics_direct(
    p_employer_id INTEGER DEFAULT NULL,
    p_user_role INTEGER DEFAULT NULL
)
RETURNS TABLE (
    incident_count BIGINT,
    worker_count BIGINT,
    site_count BIGINT,
    active_lti_count BIGINT,
    selected_employer_id INTEGER,
    selected_employer_name TEXT,
    avg_days_lost NUMERIC,
    total_days_lost_sum BIGINT,  -- Renamed to avoid ambiguity
    incidents_this_month BIGINT,
    incidents_last_month BIGINT,
    open_incidents BIGINT,
    closed_incidents BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_super_admin BOOLEAN;
    v_employer_filter INTEGER;
    v_month_start DATE;
    v_last_month_start DATE;
    v_last_month_end DATE;
BEGIN
    -- Determine if user is super admin (roles 1-4)
    v_is_super_admin := (p_user_role IN (1, 2, 3, 4));
    
    -- Set employer filter
    IF v_is_super_admin AND p_employer_id IS NULL THEN
        v_employer_filter := NULL; -- Show all for super admin when no filter
    ELSE
        v_employer_filter := p_employer_id;
    END IF;
    
    -- Calculate date ranges
    v_month_start := date_trunc('month', CURRENT_DATE)::DATE;
    v_last_month_start := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::DATE;
    v_last_month_end := (v_month_start - INTERVAL '1 day')::DATE;
    
    RETURN QUERY
    SELECT 
        -- Total active incidents (excluding archived and deleted)
        (SELECT COUNT(*) FROM incidents inc 
         WHERE (v_employer_filter IS NULL OR inc.employer_id = v_employer_filter)
         AND inc.archived_at IS NULL 
         AND inc.deleted_at IS NULL)::BIGINT,
         
        -- Worker count (workers table doesn't have deleted_at)
        (SELECT COUNT(*) FROM workers w 
         WHERE (v_employer_filter IS NULL OR w.employer_id = v_employer_filter))::BIGINT,
         
        -- Site count
        (SELECT COUNT(*) FROM sites s 
         WHERE (v_employer_filter IS NULL OR s.employer_id = v_employer_filter))::BIGINT,
         
        -- Active LTI count (excluding archived and deleted)
        (SELECT COUNT(*) FROM incidents inc 
         WHERE (v_employer_filter IS NULL OR inc.employer_id = v_employer_filter)
         AND UPPER(inc.classification) IN ('LTI', 'LOST TIME INJURY')
         AND inc.archived_at IS NULL 
         AND inc.deleted_at IS NULL)::BIGINT,
         
        -- Selected employer info
        v_employer_filter,
        COALESCE(
            (SELECT emp.employer_name FROM employers emp WHERE emp.employer_id = v_employer_filter),
            'All Companies'
        ),
        
        -- Average days lost - explicitly reference the table column
        COALESCE(
            (SELECT AVG(inc.total_days_lost)::NUMERIC FROM incidents inc 
             WHERE (v_employer_filter IS NULL OR inc.employer_id = v_employer_filter)
             AND inc.total_days_lost > 0
             AND inc.archived_at IS NULL 
             AND inc.deleted_at IS NULL),
            0
        ),
        
        -- Total days lost - explicitly reference the table column
        COALESCE(
            (SELECT SUM(inc.total_days_lost) FROM incidents inc 
             WHERE (v_employer_filter IS NULL OR inc.employer_id = v_employer_filter)
             AND inc.archived_at IS NULL 
             AND inc.deleted_at IS NULL),
            0
        )::BIGINT,
        
        -- Incidents this month
        (SELECT COUNT(*) FROM incidents inc 
         WHERE (v_employer_filter IS NULL OR inc.employer_id = v_employer_filter)
         AND inc.date_of_injury >= v_month_start
         AND inc.archived_at IS NULL 
         AND inc.deleted_at IS NULL)::BIGINT,
         
        -- Incidents last month
        (SELECT COUNT(*) FROM incidents inc 
         WHERE (v_employer_filter IS NULL OR inc.employer_id = v_employer_filter)
         AND inc.date_of_injury >= v_last_month_start
         AND inc.date_of_injury <= v_last_month_end
         AND inc.archived_at IS NULL 
         AND inc.deleted_at IS NULL)::BIGINT,
         
        -- Open incidents
        (SELECT COUNT(*) FROM incidents inc 
         WHERE (v_employer_filter IS NULL OR inc.employer_id = v_employer_filter)
         AND (inc.incident_status IS NULL OR inc.incident_status IN ('Open', 'In Progress', 'In Review', 'Voice Agent'))
         AND inc.archived_at IS NULL 
         AND inc.deleted_at IS NULL)::BIGINT,
         
        -- Closed incidents
        (SELECT COUNT(*) FROM incidents inc 
         WHERE (v_employer_filter IS NULL OR inc.employer_id = v_employer_filter)
         AND inc.incident_status IN ('Closed', 'Resolved')
         AND inc.archived_at IS NULL 
         AND inc.deleted_at IS NULL)::BIGINT;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_employer_statistics_direct(INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_employer_statistics_direct(INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_employer_statistics_direct IS 'Returns employer statistics - fixed ambiguous column references';

