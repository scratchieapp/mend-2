-- =====================================================
-- Update get_dashboard_data to support archive filtering
-- Date: 2025-12-02
-- Purpose: Add archived_at and deleted_at filtering
-- =====================================================

DROP FUNCTION IF EXISTS public.get_dashboard_data(integer, integer, integer, integer, date, date, integer, integer);

CREATE OR REPLACE FUNCTION public.get_dashboard_data(
    page_size INTEGER DEFAULT 25,
    page_offset INTEGER DEFAULT 0,
    filter_employer_id INTEGER DEFAULT NULL,
    filter_worker_id INTEGER DEFAULT NULL,
    filter_start_date DATE DEFAULT NULL,
    filter_end_date DATE DEFAULT NULL,
    user_role_id INTEGER DEFAULT NULL,
    user_employer_id INTEGER DEFAULT NULL,
    filter_archive_status TEXT DEFAULT 'active' -- 'active', 'archived', 'deleted', 'all'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_incidents JSON;
    v_total_count BIGINT;
    v_is_super_admin BOOLEAN;
    v_employer_filter INTEGER;
    v_query_start TIMESTAMP;
BEGIN
    v_query_start := clock_timestamp();
    
    -- Determine access level (super admin roles: 1-4)
    v_is_super_admin := (user_role_id IN (1, 2, 3, 4));
    
    -- Set employer filter based on role
    IF v_is_super_admin THEN
        v_employer_filter := filter_employer_id; -- Can be NULL for all employers
    ELSE
        v_employer_filter := COALESCE(filter_employer_id, user_employer_id);
    END IF;
    
    -- OPTIMIZED COUNT QUERY with archive filter
    IF v_employer_filter IS NOT NULL THEN
        SELECT COUNT(*)
        INTO v_total_count
        FROM incidents i
        WHERE i.employer_id = v_employer_filter
            AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
            AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
            AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
            AND (
                CASE filter_archive_status
                    WHEN 'active' THEN i.archived_at IS NULL AND i.deleted_at IS NULL
                    WHEN 'archived' THEN i.archived_at IS NOT NULL AND i.deleted_at IS NULL
                    WHEN 'deleted' THEN i.deleted_at IS NOT NULL
                    WHEN 'all' THEN TRUE
                    ELSE i.archived_at IS NULL AND i.deleted_at IS NULL -- default to active
                END
            );
    ELSE
        SELECT COUNT(*)
        INTO v_total_count
        FROM incidents i
        WHERE (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
            AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
            AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
            AND (
                CASE filter_archive_status
                    WHEN 'active' THEN i.archived_at IS NULL AND i.deleted_at IS NULL
                    WHEN 'archived' THEN i.archived_at IS NOT NULL AND i.deleted_at IS NULL
                    WHEN 'deleted' THEN i.deleted_at IS NOT NULL
                    WHEN 'all' THEN TRUE
                    ELSE i.archived_at IS NULL AND i.deleted_at IS NULL
                END
            );
    END IF;
    
    -- OPTIMIZED DATA QUERY with archive filter
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date_of_injury DESC, t.incident_id DESC), '[]'::json)
    INTO v_incidents
    FROM (
        SELECT 
            i.incident_id,
            COALESCE(i.incident_number, 'INC-' || i.incident_id::text) as incident_number,
            i.date_of_injury,
            i.time_of_injury,
            COALESCE(i.injury_type, 'Not specified') as injury_type,
            COALESCE(i.classification, 'Unclassified') as classification,
            COALESCE(i.incident_status, 'Open') as incident_status,
            COALESCE(i.injury_description, '') as injury_description,
            COALESCE(i.fatality, false) as fatality,
            COALESCE(i.returned_to_work, false) as returned_to_work,
            COALESCE(i.total_days_lost, 0) as total_days_lost,
            i.created_at,
            i.updated_at,
            i.archived_at,
            i.archived_by,
            i.deleted_at,
            i.deleted_by,
            i.worker_id,
            CASE 
                WHEN w.worker_id IS NOT NULL THEN 
                    COALESCE(w.given_name || ' ' || w.family_name, 'Unknown Worker')
                ELSE 'No Worker Assigned'
            END as worker_name,
            COALESCE(w.occupation, '') as worker_occupation,
            i.employer_id,
            COALESCE(e.employer_name, 'Unknown Employer') as employer_name,
            i.site_id,
            COALESCE(s.site_name, 'No Site') as site_name,
            i.department_id,
            COALESCE(d.department_name, 'No Department') as department_name,
            0::BIGINT as document_count,
            COALESCE(i.estimated_cost, 0) as estimated_cost,
            i.psychosocial_factors
        FROM incidents i
        INNER JOIN employers e ON i.employer_id = e.employer_id
        LEFT JOIN workers w ON i.worker_id = w.worker_id
        LEFT JOIN sites s ON i.site_id = s.site_id
        LEFT JOIN departments d ON i.department_id = d.department_id
        WHERE 
            (v_employer_filter IS NULL OR i.employer_id = v_employer_filter)
            AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
            AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
            AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
            AND (
                CASE filter_archive_status
                    WHEN 'active' THEN i.archived_at IS NULL AND i.deleted_at IS NULL
                    WHEN 'archived' THEN i.archived_at IS NOT NULL AND i.deleted_at IS NULL
                    WHEN 'deleted' THEN i.deleted_at IS NOT NULL
                    WHEN 'all' THEN TRUE
                    ELSE i.archived_at IS NULL AND i.deleted_at IS NULL
                END
            )
        ORDER BY i.date_of_injury DESC NULLS LAST, i.incident_id DESC
        LIMIT page_size
        OFFSET page_offset
    ) t;
    
    -- Return combined result
    RETURN json_build_object(
        'incidents', v_incidents,
        'totalCount', v_total_count,
        'pageSize', page_size,
        'pageOffset', page_offset,
        'executionTime', EXTRACT(MILLISECOND FROM clock_timestamp() - v_query_start)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_data(INTEGER, INTEGER, INTEGER, INTEGER, DATE, DATE, INTEGER, INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_data(INTEGER, INTEGER, INTEGER, INTEGER, DATE, DATE, INTEGER, INTEGER, TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_dashboard_data IS 'Fetches paginated dashboard data with RBAC and archive filtering. filter_archive_status: active (default), archived, deleted, or all';


-- Also add a function to permanently delete incidents (admin only)
CREATE OR REPLACE FUNCTION public.permanent_delete_incident(
  p_incident_id INTEGER,
  p_clerk_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role_id INTEGER;
BEGIN
  -- Get caller's role
  SELECT role_id INTO v_caller_role_id
  FROM public.users
  WHERE clerk_user_id = p_clerk_user_id
  LIMIT 1;

  -- Only super admins (roles 1-3) can permanently delete
  IF v_caller_role_id IS NULL OR v_caller_role_id > 3 THEN
    RAISE EXCEPTION 'Permission denied: Only administrators can permanently delete incidents';
  END IF;

  -- Delete the incident
  DELETE FROM incidents WHERE incident_id = p_incident_id;
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.permanent_delete_incident(INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.permanent_delete_incident(INTEGER, TEXT) TO authenticated;

