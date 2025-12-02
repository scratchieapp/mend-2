-- Migration: Fix employer statistics to exclude archived/deleted incidents
-- Purpose: Update get_employer_statistics_direct to properly filter out archived and deleted incidents

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_employer_statistics_direct(INTEGER, INTEGER);

-- Create/recreate the function with proper archive filtering
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
    total_days_lost BIGINT,
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
        (SELECT COUNT(*) FROM incidents i 
         WHERE (v_employer_filter IS NULL OR i.employer_id = v_employer_filter)
         AND i.archived_at IS NULL 
         AND i.deleted_at IS NULL)::BIGINT as incident_count,
         
        -- Worker count
        (SELECT COUNT(*) FROM workers w 
         WHERE (v_employer_filter IS NULL OR w.employer_id = v_employer_filter)
         AND w.deleted_at IS NULL)::BIGINT as worker_count,
         
        -- Site count
        (SELECT COUNT(*) FROM sites s 
         WHERE (v_employer_filter IS NULL OR s.employer_id = v_employer_filter))::BIGINT as site_count,
         
        -- Active LTI count (excluding archived and deleted)
        (SELECT COUNT(*) FROM incidents i 
         WHERE (v_employer_filter IS NULL OR i.employer_id = v_employer_filter)
         AND i.classification = 'LTI'
         AND i.archived_at IS NULL 
         AND i.deleted_at IS NULL)::BIGINT as active_lti_count,
         
        -- Selected employer info
        v_employer_filter as selected_employer_id,
        COALESCE(
            (SELECT employer_name FROM employers WHERE employer_id = v_employer_filter),
            'All Companies'
        ) as selected_employer_name,
        
        -- Average days lost
        COALESCE(
            (SELECT AVG(total_days_lost)::NUMERIC FROM incidents i 
             WHERE (v_employer_filter IS NULL OR i.employer_id = v_employer_filter)
             AND i.total_days_lost > 0
             AND i.archived_at IS NULL 
             AND i.deleted_at IS NULL),
            0
        ) as avg_days_lost,
        
        -- Total days lost
        COALESCE(
            (SELECT SUM(total_days_lost) FROM incidents i 
             WHERE (v_employer_filter IS NULL OR i.employer_id = v_employer_filter)
             AND i.archived_at IS NULL 
             AND i.deleted_at IS NULL),
            0
        )::BIGINT as total_days_lost,
        
        -- Incidents this month
        (SELECT COUNT(*) FROM incidents i 
         WHERE (v_employer_filter IS NULL OR i.employer_id = v_employer_filter)
         AND i.date_of_injury >= v_month_start
         AND i.archived_at IS NULL 
         AND i.deleted_at IS NULL)::BIGINT as incidents_this_month,
         
        -- Incidents last month
        (SELECT COUNT(*) FROM incidents i 
         WHERE (v_employer_filter IS NULL OR i.employer_id = v_employer_filter)
         AND i.date_of_injury >= v_last_month_start
         AND i.date_of_injury <= v_last_month_end
         AND i.archived_at IS NULL 
         AND i.deleted_at IS NULL)::BIGINT as incidents_last_month,
         
        -- Open incidents
        (SELECT COUNT(*) FROM incidents i 
         WHERE (v_employer_filter IS NULL OR i.employer_id = v_employer_filter)
         AND (i.incident_status IS NULL OR i.incident_status IN ('Open', 'In Progress', 'In Review'))
         AND i.archived_at IS NULL 
         AND i.deleted_at IS NULL)::BIGINT as open_incidents,
         
        -- Closed incidents
        (SELECT COUNT(*) FROM incidents i 
         WHERE (v_employer_filter IS NULL OR i.employer_id = v_employer_filter)
         AND i.incident_status IN ('Closed', 'Resolved')
         AND i.archived_at IS NULL 
         AND i.deleted_at IS NULL)::BIGINT as closed_incidents;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_employer_statistics_direct(INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_employer_statistics_direct(INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_employer_statistics_direct IS 'Returns employer statistics with proper filtering for archived and deleted incidents';

