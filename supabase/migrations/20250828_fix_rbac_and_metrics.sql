-- ============================================================================
-- CRITICAL FIX: RBAC, Metrics, and User-Employer Relationships
-- Date: 2025-08-28
-- Purpose: Fix incidents display, metrics, and implement many-to-many user-employer relationships
-- ============================================================================

-- =============================================================================
-- PART 1: Create user_employers junction table for many-to-many relationships
-- =============================================================================

-- Create the junction table for users to be assigned to multiple employers
CREATE TABLE IF NOT EXISTS public.user_employers (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    employer_id INTEGER NOT NULL REFERENCES employers(employer_id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(user_id),
    UNIQUE(user_id, employer_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_employers_user_id ON user_employers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_employers_employer_id ON user_employers(employer_id);
CREATE INDEX IF NOT EXISTS idx_user_employers_primary ON user_employers(user_id, is_primary) WHERE is_primary = true;

-- Migrate existing user-employer relationships
INSERT INTO user_employers (user_id, employer_id, is_primary)
SELECT user_id, employer_id, true
FROM users
WHERE employer_id IS NOT NULL
ON CONFLICT (user_id, employer_id) DO NOTHING;

-- =============================================================================
-- PART 2: Add missing columns for metrics (if they don't exist)
-- =============================================================================

-- Add estimated_cost column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='estimated_cost') 
    THEN
        ALTER TABLE incidents ADD COLUMN estimated_cost DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- Add psychosocial_factors column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='psychosocial_factors') 
    THEN
        ALTER TABLE incidents ADD COLUMN psychosocial_factors BOOLEAN DEFAULT false;
    END IF;
END $$;

-- =============================================================================
-- PART 3: Update RBAC function to fix worker_full_name field
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_incidents_with_details_rbac CASCADE;

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
    
    -- Worker details (split for compatibility)
    worker_id integer,
    worker_first_name text,
    worker_last_name text,
    worker_full_name text,
    worker_employee_number text,
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
    site_location text,  -- Added for compatibility
    site_supervisor text,
    
    -- Department details
    department_id integer,
    department_name text,
    
    -- Medical professional details (for compatibility)
    medical_professional_id integer,
    medical_professional_name text,
    medical_professional_specialty text,
    medical_professional_phone text,
    
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
        COALESCE(i.total_days_lost, 0)::integer,
        COALESCE(i.actions, '')::text,
        COALESCE(i.case_notes, '')::text,
        COALESCE(i.witness, '')::text,
        COALESCE(i.doctor_notes, '')::text,
        COALESCE(i.shift_arrangement, '')::text,
        COALESCE(i.incident_summary, '')::text,
        
        -- Timestamps
        i.created_at,
        i.updated_at,
        
        -- Worker details (properly split)
        w.worker_id::integer,
        COALESCE(w.first_name, '')::text as worker_first_name,
        COALESCE(w.last_name, '')::text as worker_last_name,
        COALESCE(w.first_name || ' ' || w.last_name, '')::text as worker_full_name,
        COALESCE(w.employee_number, '')::text as worker_employee_number,
        COALESCE(w.occupation, '')::text as worker_occupation,
        COALESCE(w.phone, '')::text as worker_phone,
        COALESCE(w.email, '')::text as worker_email,
        COALESCE(w.employment_type, '')::text as worker_employment_type,
        
        -- Employer details
        e.employer_id::integer,
        COALESCE(e.employer_name, '')::text,
        COALESCE(e.abn, '')::text as employer_abn,
        COALESCE(e.employer_state, '')::text,
        COALESCE(e.employer_phone, '')::text,
        COALESCE(e.manager_name, '')::text as employer_manager_name,
        COALESCE(e.manager_email, '')::text as employer_manager_email,
        
        -- Site details
        s.site_id::integer,
        COALESCE(s.site_name, '')::text,
        COALESCE(s.site_address, '')::text,
        COALESCE(s.site_city, '')::text,
        COALESCE(s.site_state, '')::text,
        COALESCE(s.site_city || ', ' || s.site_state, '')::text as site_location,
        COALESCE(s.site_supervisor, '')::text,
        
        -- Department details
        d.department_id::integer,
        COALESCE(d.department_name, '')::text,
        
        -- Medical professional details
        i.medical_professional_id::integer,
        NULL::text as medical_professional_name,
        NULL::text as medical_professional_specialty,
        NULL::text as medical_professional_phone,
        
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
            
            -- For other roles, check if they have access through user_employers
            ELSE EXISTS (
                SELECT 1 FROM user_employers ue 
                WHERE ue.user_id = (SELECT user_id FROM users WHERE role_id = user_role_id LIMIT 1)
                AND ue.employer_id = i.employer_id
            ) OR (
                -- Fallback to direct employer_id for backward compatibility
                user_employer_id IS NOT NULL AND i.employer_id = user_employer_id
            )
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
-- PART 4: Create Metrics RBAC Functions
-- =============================================================================

-- Function to get incident metrics with RBAC
CREATE OR REPLACE FUNCTION public.get_incident_metrics_rbac(
    user_role_id INTEGER DEFAULT NULL,
    user_employer_id INTEGER DEFAULT NULL,
    filter_employer_id INTEGER DEFAULT NULL,
    filter_start_date DATE DEFAULT NULL,
    filter_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_incidents bigint,
    avg_lost_time numeric,
    total_lost_days bigint,
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
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint as total_incidents,
        ROUND(AVG(i.total_days_lost)::numeric, 1) as avg_lost_time,
        COALESCE(SUM(i.total_days_lost)::bigint, 0) as total_lost_days,
        COALESCE(SUM(i.estimated_cost)::numeric, 0) as total_claim_costs,
        COUNT(*) FILTER (WHERE i.psychosocial_factors = true)::bigint as psychosocial_count,
        COUNT(*) FILTER (WHERE i.fatality = true)::bigint as fatality_count,
        COUNT(*) FILTER (WHERE i.classification = 'LTI')::bigint as lti_count,
        COUNT(*) FILTER (WHERE i.classification = 'MTI')::bigint as mti_count,
        COUNT(*) FILTER (WHERE i.classification = 'FAI')::bigint as fai_count
    FROM incidents i
    WHERE 
        -- RBAC Logic (same as incidents function)
        CASE 
            WHEN user_role_id IS NULL THEN true
            WHEN user_role_id IN (1, 2) THEN true  -- Super Admin and Account Manager see all
            ELSE EXISTS (
                SELECT 1 FROM user_employers ue 
                WHERE ue.user_id = (SELECT user_id FROM users WHERE role_id = user_role_id LIMIT 1)
                AND ue.employer_id = i.employer_id
            ) OR (
                user_employer_id IS NOT NULL AND i.employer_id = user_employer_id
            )
        END
        AND (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
        AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
        AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date);
END;
$$;

-- =============================================================================
-- PART 5: Create function to get user's assigned employers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_employers(
    p_user_id UUID
)
RETURNS TABLE (
    employer_id integer,
    employer_name text,
    is_primary boolean,
    assigned_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.employer_id::integer,
        e.employer_name::text,
        ue.is_primary,
        ue.assigned_at
    FROM user_employers ue
    JOIN employers e ON ue.employer_id = e.employer_id
    WHERE ue.user_id = p_user_id
    ORDER BY ue.is_primary DESC, e.employer_name;
END;
$$;

-- =============================================================================
-- PART 6: Create function to assign user to employer
-- =============================================================================

CREATE OR REPLACE FUNCTION public.assign_user_to_employer(
    p_user_id UUID,
    p_employer_id INTEGER,
    p_is_primary BOOLEAN DEFAULT false,
    p_assigned_by UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If setting as primary, unset other primary assignments
    IF p_is_primary THEN
        UPDATE user_employers 
        SET is_primary = false 
        WHERE user_id = p_user_id AND is_primary = true;
    END IF;
    
    -- Insert or update the assignment
    INSERT INTO user_employers (user_id, employer_id, is_primary, assigned_by)
    VALUES (p_user_id, p_employer_id, p_is_primary, p_assigned_by)
    ON CONFLICT (user_id, employer_id) 
    DO UPDATE SET 
        is_primary = EXCLUDED.is_primary,
        assigned_at = NOW();
    
    RETURN true;
END;
$$;

-- =============================================================================
-- PART 7: Create function to remove user from employer
-- =============================================================================

CREATE OR REPLACE FUNCTION public.remove_user_from_employer(
    p_user_id UUID,
    p_employer_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM user_employers 
    WHERE user_id = p_user_id AND employer_id = p_employer_id;
    
    RETURN FOUND;
END;
$$;

-- =============================================================================
-- PART 8: Populate some test data for metrics
-- =============================================================================

-- Add some estimated costs and psychosocial flags to existing incidents for testing
UPDATE incidents 
SET estimated_cost = CASE 
    WHEN classification = 'LTI' THEN 25000 + (random() * 75000)
    WHEN classification = 'MTI' THEN 5000 + (random() * 20000)
    WHEN classification = 'FAI' THEN 500 + (random() * 4500)
    ELSE 1000 + (random() * 10000)
END
WHERE estimated_cost IS NULL OR estimated_cost = 0;

UPDATE incidents 
SET psychosocial_factors = CASE 
    WHEN random() < 0.15 THEN true  -- 15% of incidents have psychosocial factors
    ELSE false
END
WHERE psychosocial_factors IS NULL;

-- =============================================================================
-- PART 9: Grant necessary permissions
-- =============================================================================

GRANT ALL ON user_employers TO authenticated;
GRANT EXECUTE ON FUNCTION get_incident_metrics_rbac TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_employers TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_to_employer TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_from_employer TO authenticated;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Test that Super Admin can see all incidents
-- SELECT COUNT(*) FROM get_incidents_with_details_rbac(
--     user_role_id := 1,
--     user_employer_id := NULL
-- );

-- Test metrics function
-- SELECT * FROM get_incident_metrics_rbac(
--     user_role_id := 1,
--     user_employer_id := NULL
-- );