-- Create employer context management functions
-- Date: 2025-08-28
-- Purpose: Provide employer context management and statistics for dashboard

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.get_employer_context CASCADE;
DROP FUNCTION IF EXISTS public.set_employer_context CASCADE;
DROP FUNCTION IF EXISTS public.clear_employer_context CASCADE;
DROP FUNCTION IF EXISTS public.get_employer_statistics CASCADE;

-- Create user_session_contexts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_session_contexts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    employer_id INTEGER REFERENCES employers(employer_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =============================================================================
-- FUNCTION: get_employer_context
-- Purpose: Get the current employer context for the user
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_employer_context()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_employer_id INTEGER;
    v_user_id UUID;
BEGIN
    -- Get the current user ID from auth context
    v_user_id := auth.uid();
    
    -- If no user context, return NULL
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get the employer context from session
    SELECT employer_id INTO v_employer_id
    FROM user_session_contexts
    WHERE user_id = v_user_id;
    
    -- If no session context exists, get from users table
    IF v_employer_id IS NULL THEN
        SELECT u.employer_id INTO v_employer_id
        FROM users u
        WHERE u.clerk_user_id = v_user_id::text
        LIMIT 1;
    END IF;
    
    RETURN v_employer_id;
END;
$$;

-- =============================================================================
-- FUNCTION: set_employer_context
-- Purpose: Set the employer context for the current user session
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_employer_context(p_employer_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
    v_user_id UUID;
    v_user_role INTEGER;
    v_user_employer INTEGER;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Get user's role and employer from users table
    SELECT role_id, employer_id INTO v_user_role, v_user_employer
    FROM users
    WHERE clerk_user_id = v_user_id::text
    LIMIT 1;
    
    -- Check if user can access this employer
    -- Super Admin (role 1) and Account Manager (role 2) can access any employer
    IF v_user_role NOT IN (1, 2) AND p_employer_id != v_user_employer THEN
        RAISE EXCEPTION 'Access denied to employer %', p_employer_id;
    END IF;
    
    -- Upsert the context
    INSERT INTO user_session_contexts (user_id, employer_id, updated_at)
    VALUES (v_user_id, p_employer_id, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        employer_id = EXCLUDED.employer_id,
        updated_at = NOW();
END;
$$;

-- =============================================================================
-- FUNCTION: clear_employer_context
-- Purpose: Clear the employer context for the current user
-- =============================================================================
CREATE OR REPLACE FUNCTION public.clear_employer_context()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;
    
    DELETE FROM user_session_contexts
    WHERE user_id = v_user_id;
END;
$$;

-- =============================================================================
-- FUNCTION: get_employer_statistics
-- Purpose: Get statistics for the current employer context
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_employer_statistics()
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
STABLE
AS $$
DECLARE
    v_employer_id INTEGER;
    v_user_id UUID;
    v_user_role INTEGER;
    v_user_employer INTEGER;
BEGIN
    -- Get current user context
    v_user_id := auth.uid();
    
    -- If no auth context, try to use the session employer context
    IF v_user_id IS NOT NULL THEN
        -- Get user's role and employer
        SELECT role_id, employer_id INTO v_user_role, v_user_employer
        FROM users
        WHERE clerk_user_id = v_user_id::text
        LIMIT 1;
        
        -- Get employer context
        v_employer_id := get_employer_context();
        
        -- If no context set, use user's default employer
        IF v_employer_id IS NULL THEN
            v_employer_id := v_user_employer;
        END IF;
    END IF;
    
    -- Return statistics for the employer
    RETURN QUERY
    SELECT 
        -- Total incidents for this employer
        COUNT(DISTINCT i.incident_id)::BIGINT as incident_count,
        
        -- Total workers for this employer
        (SELECT COUNT(DISTINCT w.worker_id)::BIGINT 
         FROM workers w 
         WHERE w.employer_id = v_employer_id) as worker_count,
        
        -- Total sites for this employer
        (SELECT COUNT(DISTINCT s.site_id)::BIGINT 
         FROM sites s 
         WHERE s.employer_id = v_employer_id) as site_count,
        
        -- Active LTI count
        COUNT(DISTINCT CASE 
            WHEN i.classification = 'LTI' 
            AND i.incident_status = 'Open' 
            THEN i.incident_id 
        END)::BIGINT as active_lti_count,
        
        -- Selected employer info
        v_employer_id as selected_employer_id,
        (SELECT e.employer_name FROM employers e WHERE e.employer_id = v_employer_id) as selected_employer_name,
        
        -- Average days lost
        AVG(COALESCE(i.total_days_lost, 0))::NUMERIC as avg_days_lost,
        
        -- Total days lost
        SUM(COALESCE(i.total_days_lost, 0))::BIGINT as total_days_lost,
        
        -- Incidents this month
        COUNT(DISTINCT CASE 
            WHEN DATE_TRUNC('month', i.date_of_injury) = DATE_TRUNC('month', CURRENT_DATE)
            THEN i.incident_id 
        END)::BIGINT as incidents_this_month,
        
        -- Incidents last month
        COUNT(DISTINCT CASE 
            WHEN DATE_TRUNC('month', i.date_of_injury) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
            THEN i.incident_id 
        END)::BIGINT as incidents_last_month,
        
        -- Open incidents
        COUNT(DISTINCT CASE 
            WHEN i.incident_status = 'Open' 
            THEN i.incident_id 
        END)::BIGINT as open_incidents,
        
        -- Closed incidents
        COUNT(DISTINCT CASE 
            WHEN i.incident_status = 'Closed' 
            THEN i.incident_id 
        END)::BIGINT as closed_incidents
        
    FROM incidents i
    WHERE 
        -- Apply RBAC filtering
        CASE 
            -- Super Admin sees all if no employer context set
            WHEN v_user_role = 1 AND v_employer_id IS NULL THEN true
            
            -- Otherwise filter by employer
            WHEN v_employer_id IS NOT NULL THEN i.employer_id = v_employer_id
            
            -- Default: no access
            ELSE false
        END;
END;
$$;

-- =============================================================================
-- Alternative version without auth dependency for direct calls
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_employer_statistics_direct(
    p_employer_id INTEGER,
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
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Total incidents for this employer
        COUNT(DISTINCT i.incident_id)::BIGINT as incident_count,
        
        -- Total workers for this employer
        (SELECT COUNT(DISTINCT w.worker_id)::BIGINT 
         FROM workers w 
         WHERE w.employer_id = p_employer_id) as worker_count,
        
        -- Total sites for this employer
        (SELECT COUNT(DISTINCT s.site_id)::BIGINT 
         FROM sites s 
         WHERE s.employer_id = p_employer_id) as site_count,
        
        -- Active LTI count
        COUNT(DISTINCT CASE 
            WHEN i.classification = 'LTI' 
            AND i.incident_status = 'Open' 
            THEN i.incident_id 
        END)::BIGINT as active_lti_count,
        
        -- Selected employer info
        p_employer_id as selected_employer_id,
        (SELECT e.employer_name FROM employers e WHERE e.employer_id = p_employer_id) as selected_employer_name,
        
        -- Average days lost
        AVG(COALESCE(i.total_days_lost, 0))::NUMERIC as avg_days_lost,
        
        -- Total days lost
        SUM(COALESCE(i.total_days_lost, 0))::BIGINT as total_days_lost,
        
        -- Incidents this month
        COUNT(DISTINCT CASE 
            WHEN DATE_TRUNC('month', i.date_of_injury) = DATE_TRUNC('month', CURRENT_DATE)
            THEN i.incident_id 
        END)::BIGINT as incidents_this_month,
        
        -- Incidents last month
        COUNT(DISTINCT CASE 
            WHEN DATE_TRUNC('month', i.date_of_injury) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
            THEN i.incident_id 
        END)::BIGINT as incidents_last_month,
        
        -- Open incidents
        COUNT(DISTINCT CASE 
            WHEN i.incident_status = 'Open' 
            THEN i.incident_id 
        END)::BIGINT as open_incidents,
        
        -- Closed incidents
        COUNT(DISTINCT CASE 
            WHEN i.incident_status = 'Closed' 
            THEN i.incident_id 
        END)::BIGINT as closed_incidents
        
    FROM incidents i
    WHERE i.employer_id = p_employer_id;
END;
$$;

-- =============================================================================
-- Grant Permissions
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.get_employer_context TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employer_context TO anon;
GRANT EXECUTE ON FUNCTION public.set_employer_context TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_employer_context TO anon;
GRANT EXECUTE ON FUNCTION public.clear_employer_context TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_employer_context TO anon;
GRANT EXECUTE ON FUNCTION public.get_employer_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employer_statistics TO anon;
GRANT EXECUTE ON FUNCTION public.get_employer_statistics_direct TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employer_statistics_direct TO anon;

-- Grant permissions on user_session_contexts table
GRANT ALL ON public.user_session_contexts TO authenticated;
GRANT ALL ON public.user_session_contexts TO anon;

-- =============================================================================
-- Add Documentation
-- =============================================================================
COMMENT ON FUNCTION public.get_employer_context IS 
'Gets the current employer context for the authenticated user.
Returns the employer_id from session context or user default.';

COMMENT ON FUNCTION public.set_employer_context IS 
'Sets the employer context for the current user session.
Super Admin and Account Manager can set any employer.
Other roles can only set their own employer.';

COMMENT ON FUNCTION public.get_employer_statistics IS 
'Gets statistics for the current employer context.
Returns incident counts, worker counts, site counts, and other metrics.';

COMMENT ON FUNCTION public.get_employer_statistics_direct IS 
'Direct version of get_employer_statistics that accepts employer_id as parameter.
Useful for applications that manage auth outside of Supabase.';