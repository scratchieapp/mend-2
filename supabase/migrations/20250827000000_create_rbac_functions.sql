-- Create RBAC-enabled functions for Clerk authentication
-- Date: 2025-08-27
-- Purpose: Create functions that handle role-based access control without relying on Supabase auth

-- Drop existing RBAC functions if they exist
DROP FUNCTION IF EXISTS public.get_incidents_with_details_rbac CASCADE;
DROP FUNCTION IF EXISTS public.get_incidents_count_rbac CASCADE;

-- =============================================================================
-- FUNCTION: get_incidents_with_details_rbac
-- Purpose: Retrieve incidents with role-based access control for Clerk auth
-- =============================================================================
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
    -- Core incident fields
    incident_id integer,
    incident_number text,
    date_of_injury date,
    time_of_injury time,
    injury_type text,
    classification text,
    incident_status text,
    fatality boolean,
    
    -- Detailed incident information
    injury_description text,
    treatment_provided text,
    returned_to_work boolean,
    total_days_lost integer,
    actions text,
    case_notes text,
    witness text,
    doctor_notes text,
    shift_arrangement text,
    incident_summary text,
    
    -- Timestamps
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    
    -- Worker details
    worker_id integer,
    worker_name text,
    worker_occupation text,
    worker_phone text,
    worker_email text,
    worker_employment_type text,
    
    -- Employer details
    employer_id integer,
    employer_name text,
    employer_abn text,
    employer_state text,
    employer_phone text,
    employer_manager_name text,
    employer_manager_email text,
    
    -- Site details
    site_id integer,
    site_name text,
    site_address text,
    site_city text,
    site_state text,
    site_supervisor text,
    
    -- Department details
    department_id integer,
    department_name text,
    
    -- Document count
    document_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Core incident fields
        i.incident_id::integer,
        COALESCE(i.incident_number, '')::text,
        i.date_of_injury,
        i.time_of_injury,
        COALESCE(i.injury_type, '')::text,
        COALESCE(i.classification, '')::text,
        COALESCE(i.incident_status, 'Open')::text,
        COALESCE(i.fatality, false),
        
        -- Detailed incident information
        COALESCE(i.injury_description, '')::text,
        COALESCE(i.treatment_provided, '')::text,
        COALESCE(i.returned_to_work, false),
        COALESCE(i.total_days_lost, 0),
        COALESCE(i.actions, '')::text,
        COALESCE(i.case_notes, '')::text,
        COALESCE(i.witness, '')::text,
        COALESCE(i.doctor_notes, '')::text,
        COALESCE(i.shift_arrangement, '')::text,
        COALESCE(i.incident_summary, '')::text,
        
        -- Timestamps
        i.created_at,
        i.updated_at,
        
        -- Worker details
        w.worker_id::integer,
        COALESCE(CONCAT(w.given_name, ' ', w.family_name), '')::text AS worker_name,
        COALESCE(w.occupation, '')::text,
        COALESCE(COALESCE(w.mobile_number, w.phone_number), '')::text AS worker_phone,
        COALESCE(w.email, '')::text,
        COALESCE(w.employment_type, '')::text,
        
        -- Employer details
        e.employer_id::integer,
        COALESCE(e.employer_name, '')::text,
        COALESCE(e.abn, '')::text,
        COALESCE(e.employer_state, '')::text,
        COALESCE(e.employer_phone, '')::text,
        COALESCE(e.manager_name, '')::text,
        COALESCE(e.manager_email, '')::text,
        
        -- Site details
        s.site_id::integer,
        COALESCE(s.site_name, '')::text,
        COALESCE(s.street_address, '')::text,
        COALESCE(s.city, '')::text,
        COALESCE(s.state, '')::text,
        COALESCE(s.supervisor_name, '')::text,
        
        -- Department details
        d.department_id::integer,
        COALESCE(d.department_name, '')::text,
        
        -- Document count
        COALESCE(doc_count.count, 0)::bigint
        
    FROM incidents i
    LEFT JOIN workers w ON i.worker_id = w.worker_id
    LEFT JOIN employers e ON i.employer_id = e.employer_id
    LEFT JOIN sites s ON i.site_id = s.site_id
    LEFT JOIN departments d ON i.department_id = d.department_id
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS count
        FROM incident_documents id
        WHERE id.incident_id = i.incident_id
    ) doc_count ON true
    
    WHERE 
        -- RBAC Logic
        CASE 
            -- No user context provided = no filtering (for backward compatibility)
            WHEN user_role_id IS NULL THEN true
            
            -- Super Admin (role_id = 1) sees ALL incidents regardless of employer
            WHEN user_role_id = 1 THEN true
            
            -- Account Manager (role_id = 2) sees all incidents
            WHEN user_role_id = 2 THEN true
            
            -- Data Entry (role_id = 3) sees only their employer's incidents
            WHEN user_role_id = 3 AND user_employer_id IS NOT NULL 
                THEN i.employer_id = user_employer_id
            
            -- Data Analyst (role_id = 4) sees all incidents for analysis
            WHEN user_role_id = 4 THEN true
            
            -- Builder Admin (role_id = 5) sees only their employer's incidents
            WHEN user_role_id = 5 AND user_employer_id IS NOT NULL 
                THEN i.employer_id = user_employer_id
            
            -- Medical Professional (role_id = 6) sees all incidents (for medical oversight)
            WHEN user_role_id = 6 THEN true
            
            -- Insurance Provider (role_id = 7) sees all incidents (for claims)
            WHEN user_role_id = 7 THEN true
            
            -- Government Official (role_id = 8) sees all incidents (for compliance)
            WHEN user_role_id = 8 THEN true
            
            -- Site Admin (role_id = 9) sees only their employer's incidents
            WHEN user_role_id = 9 AND user_employer_id IS NOT NULL 
                THEN i.employer_id = user_employer_id
            
            -- Default: deny access
            ELSE false
        END
        
        -- Apply additional filters
        AND (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
        AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
        AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
        AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
    
    ORDER BY i.date_of_injury DESC NULLS LAST, i.time_of_injury DESC NULLS LAST, i.created_at DESC
    LIMIT page_size
    OFFSET page_offset;
END;
$$;

-- =============================================================================
-- FUNCTION: get_incidents_count_rbac
-- Purpose: Get count of incidents with role-based access control
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_incidents_count_rbac(
    filter_employer_id INTEGER DEFAULT NULL,
    filter_worker_id INTEGER DEFAULT NULL,
    filter_start_date DATE DEFAULT NULL,
    filter_end_date DATE DEFAULT NULL,
    user_role_id INTEGER DEFAULT NULL,
    user_employer_id INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    incident_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO incident_count
    FROM incidents i
    WHERE 
        -- RBAC Logic (same as get_incidents_with_details_rbac)
        CASE 
            -- No user context provided = no filtering
            WHEN user_role_id IS NULL THEN true
            
            -- Super Admin (role_id = 1) sees ALL incidents
            WHEN user_role_id = 1 THEN true
            
            -- Account Manager (role_id = 2) sees all incidents
            WHEN user_role_id = 2 THEN true
            
            -- Data Entry (role_id = 3) sees only their employer's incidents
            WHEN user_role_id = 3 AND user_employer_id IS NOT NULL 
                THEN i.employer_id = user_employer_id
            
            -- Data Analyst (role_id = 4) sees all incidents
            WHEN user_role_id = 4 THEN true
            
            -- Builder Admin (role_id = 5) sees only their employer's incidents
            WHEN user_role_id = 5 AND user_employer_id IS NOT NULL 
                THEN i.employer_id = user_employer_id
            
            -- Medical Professional (role_id = 6) sees all incidents
            WHEN user_role_id = 6 THEN true
            
            -- Insurance Provider (role_id = 7) sees all incidents
            WHEN user_role_id = 7 THEN true
            
            -- Government Official (role_id = 8) sees all incidents
            WHEN user_role_id = 8 THEN true
            
            -- Site Admin (role_id = 9) sees only their employer's incidents
            WHEN user_role_id = 9 AND user_employer_id IS NOT NULL 
                THEN i.employer_id = user_employer_id
            
            -- Default: deny access
            ELSE false
        END
        
        -- Apply additional filters
        AND (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
        AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
        AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
        AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date);
    
    RETURN COALESCE(incident_count, 0);
END;
$$;

-- =============================================================================
-- Grant Permissions
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.get_incidents_with_details_rbac TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incidents_with_details_rbac TO anon;
GRANT EXECUTE ON FUNCTION public.get_incidents_count_rbac TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incidents_count_rbac TO anon;

-- =============================================================================
-- Add Documentation
-- =============================================================================
COMMENT ON FUNCTION public.get_incidents_with_details_rbac IS 
'RBAC-enabled function for retrieving incidents with Clerk authentication.
Super Admin (role_id = 1) sees ALL incidents.
Builder Admin (role_id = 5) and other restricted roles see only their employer incidents.
Accepts role and employer parameters directly for Clerk integration.';

COMMENT ON FUNCTION public.get_incidents_count_rbac IS 
'RBAC-enabled function for counting incidents with Clerk authentication.
Uses same access control logic as get_incidents_with_details_rbac.';