-- Fix get_incidents_with_details function with exact column names from database
-- This migration corrects all column name references based on actual database schema

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_incidents_with_details(uuid, integer, integer);

-- Create the corrected function with exact column names
CREATE OR REPLACE FUNCTION public.get_incidents_with_details(
    p_user_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    incident_id bigint,
    incident_number text,
    date_of_injury date,
    time_of_injury time,
    injury_type text,
    classification text,
    incident_status text,
    fatality boolean,
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
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    
    -- Worker details (using exact column names)
    worker_id bigint,
    worker_name text,
    worker_occupation text,
    worker_phone text,
    worker_email text,
    worker_employment_type text,
    
    -- Employer details (using exact column names)
    employer_id bigint,
    employer_name text,
    employer_state text,
    employer_phone text,
    employer_manager_name text,
    employer_manager_email text,
    
    -- Site details (using exact column names)
    site_id bigint,
    site_name text,
    site_address text,
    site_city text,
    site_state text,
    site_supervisor text,
    
    -- Department details (using exact column names)
    department_id bigint,
    department_name text,
    
    -- Injury code details
    noi_description text,
    moi_description text,
    aoi_description text,
    bl_description text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role_id integer;
    v_user_employer_id bigint;
    v_selected_employer_id bigint;
BEGIN
    -- Get user details if user_id is provided
    IF p_user_id IS NOT NULL THEN
        SELECT role_id, employer_id 
        INTO v_user_role_id, v_user_employer_id
        FROM users 
        WHERE user_id = p_user_id;
        
        -- Check for selected employer context
        SELECT selected_employer_id 
        INTO v_selected_employer_id
        FROM user_session_contexts 
        WHERE user_id = p_user_id;
    END IF;
    
    RETURN QUERY
    SELECT 
        -- Incident details
        i.incident_id,
        i.incident_number,
        i.date_of_injury,
        i.time_of_injury,
        i.injury_type,
        i.classification,
        i.incident_status,
        i.fatality,
        i.injury_description,
        i.treatment_provided,
        i.returned_to_work,
        i.total_days_lost,
        i.actions,
        i.case_notes,
        i.witness,
        i.doctor_notes,
        i.shift_arrangement,
        i.incident_summary,
        i.created_at,
        i.updated_at,
        
        -- Worker details with exact column names
        w.worker_id,
        CONCAT(w.given_name, ' ', w.family_name)::text AS worker_name,
        w.occupation::text AS worker_occupation,
        COALESCE(w.mobile_number, w.phone_number)::text AS worker_phone,
        w.email::text AS worker_email,
        w.employment_type::text AS worker_employment_type,
        
        -- Employer details with exact column names
        e.employer_id,
        e.employer_name::text,
        e.employer_state::text,
        e.employer_phone::text,
        e.manager_name::text AS employer_manager_name,
        e.manager_email::text AS employer_manager_email,
        
        -- Site details with exact column names
        s.site_id,
        s.site_name::text,
        s.street_address::text AS site_address,
        s.city::text AS site_city,
        s.state::text AS site_state,
        s.supervisor_name::text AS site_supervisor,
        
        -- Department details with exact column names
        d.department_id,
        d.department_name::text,
        
        -- Injury code descriptions
        noi.noi_description::text,
        moi.moi_description::text,
        aoi.aoi_description::text,
        bl.bl_description::text
        
    FROM incidents i
    LEFT JOIN workers w ON i.worker_id = w.worker_id
    LEFT JOIN employers e ON i.employer_id = e.employer_id
    LEFT JOIN sites s ON i.site_id = s.site_id
    LEFT JOIN departments d ON i.department_id = d.department_id
    LEFT JOIN nature_of_injury_codes noi ON i.noi_code_id = noi.noi_code_id
    LEFT JOIN mechanism_of_injury_codes moi ON i.moi_code_id = moi.moi_code_id
    LEFT JOIN agency_of_injury_codes aoi ON i.aoi_code_id = aoi.aoi_code_id
    LEFT JOIN bodily_location_codes bl ON i.bl_code_id = bl.bl_code_id
    
    WHERE 
        -- Apply filtering based on user role and context
        CASE 
            -- No user context, return all
            WHEN p_user_id IS NULL THEN true
            
            -- Super Admin (role 1) with "View All" context (-1)
            WHEN v_user_role_id = 1 AND v_selected_employer_id = -1 THEN true
            
            -- Super Admin with specific employer selected
            WHEN v_user_role_id = 1 AND v_selected_employer_id IS NOT NULL AND v_selected_employer_id != -1 
                THEN i.employer_id = v_selected_employer_id
            
            -- Super Admin with no selection (default to all)
            WHEN v_user_role_id = 1 AND v_selected_employer_id IS NULL THEN true
            
            -- Account Manager (role 2) sees all incidents
            WHEN v_user_role_id = 2 THEN true
            
            -- Data Analyst (role 4) sees all incidents
            WHEN v_user_role_id = 4 THEN true
            
            -- Government Official (role 7) sees all incidents
            WHEN v_user_role_id = 7 THEN true
            
            -- Builder Admin (role 5) sees their employer's incidents
            WHEN v_user_role_id = 5 AND v_user_employer_id IS NOT NULL 
                THEN i.employer_id = v_user_employer_id
            
            -- Medical Professional (role 6) sees all incidents (for now)
            WHEN v_user_role_id = 6 THEN true
            
            -- Insurance Provider (role 8) sees all incidents (for now)
            WHEN v_user_role_id = 8 THEN true
            
            -- Vendor (role 9) sees their employer's incidents
            WHEN v_user_role_id = 9 AND v_user_employer_id IS NOT NULL 
                THEN i.employer_id = v_user_employer_id
            
            -- Data Entry (role 3) sees their employer's incidents
            WHEN v_user_role_id = 3 AND v_user_employer_id IS NOT NULL 
                THEN i.employer_id = v_user_employer_id
            
            -- Default: no access
            ELSE false
        END
    
    ORDER BY i.date_of_injury DESC, i.time_of_injury DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_incidents_with_details(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incidents_with_details(uuid, integer, integer) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_incidents_with_details IS 'Retrieves incident details with related worker, employer, site, department, and injury code information. Filters results based on user role and selected employer context.';

-- Test the function to ensure it works
-- This should return data without errors
DO $$
DECLARE
    v_count integer;
BEGIN
    -- Test without user context (should return all)
    SELECT COUNT(*) INTO v_count 
    FROM get_incidents_with_details(NULL, 10, 0);
    
    RAISE NOTICE 'Function test passed. Found % incidents without user context.', v_count;
    
    -- Test with a sample user if one exists
    IF EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        SELECT COUNT(*) INTO v_count 
        FROM get_incidents_with_details((SELECT user_id FROM users LIMIT 1), 10, 0);
        
        RAISE NOTICE 'Function test passed. Found % incidents with user context.', v_count;
    END IF;
END;
$$;