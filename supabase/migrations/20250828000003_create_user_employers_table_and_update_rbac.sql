-- =====================================================================
-- CREATE USER-EMPLOYER RELATIONSHIP TABLE AND UPDATE RBAC
-- Date: 2025-08-28
-- Purpose: Create proper user-employer relationships for role-based access
-- 
-- CRITICAL: This migration creates the missing user_employers table
-- and updates all RBAC functions to use it properly
-- =====================================================================

-- =============================================================================
-- STEP 1: CREATE USER_EMPLOYERS TABLE
-- This table manages many-to-many relationships between users and employers
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_employers (
    user_employer_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    employer_id INTEGER NOT NULL REFERENCES public.employers(employer_id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false, -- Mark primary employer for users with multiple
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES public.users(user_id), -- Who assigned this relationship
    notes TEXT, -- Optional notes about the assignment
    
    -- Ensure unique user-employer combinations
    CONSTRAINT unique_user_employer UNIQUE (user_id, employer_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_employers_user_id ON public.user_employers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_employers_employer_id ON public.user_employers(employer_id);
CREATE INDEX IF NOT EXISTS idx_user_employers_primary ON public.user_employers(user_id, is_primary) WHERE is_primary = true;

-- Add table comments
COMMENT ON TABLE public.user_employers IS 'Many-to-many relationship between users and employers. MEND staff (roles 1-4) don''t need entries here as they see all data.';
COMMENT ON COLUMN public.user_employers.is_primary IS 'Indicates the primary employer for users with multiple assignments';
COMMENT ON COLUMN public.user_employers.assigned_by IS 'User who created this assignment for audit purposes';

-- =============================================================================
-- STEP 2: POPULATE INITIAL DATA
-- Migrate existing employer_id relationships from users table
-- =============================================================================
INSERT INTO public.user_employers (user_id, employer_id, is_primary, notes)
SELECT 
    u.user_id,
    u.employer_id,
    true as is_primary,
    'Migrated from users.employer_id field' as notes
FROM public.users u
WHERE u.employer_id IS NOT NULL
  AND u.role_id = 5 -- Only Builder Admins need employer assignments initially
ON CONFLICT (user_id, employer_id) DO NOTHING;

-- =============================================================================
-- STEP 3: CREATE HELPER FUNCTION TO GET USER'S EMPLOYERS
-- Returns list of employer IDs a user has access to
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_user_employer_ids(
    p_user_id UUID,
    p_role_id INTEGER
)
RETURNS INTEGER[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    employer_ids INTEGER[];
BEGIN
    -- MEND staff (roles 1-4) see everything - return NULL (handled in RBAC)
    IF p_role_id IN (1, 2, 3, 4) THEN
        RETURN NULL; -- NULL means "see all"
    END IF;
    
    -- Other roles get their assigned employers
    SELECT ARRAY_AGG(employer_id) INTO employer_ids
    FROM public.user_employers
    WHERE user_id = p_user_id;
    
    -- If no employers assigned, return empty array
    RETURN COALESCE(employer_ids, ARRAY[]::INTEGER[]);
END;
$$;

COMMENT ON FUNCTION public.get_user_employer_ids IS 'Returns array of employer IDs a user has access to. Returns NULL for MEND staff who see all.';

-- =============================================================================
-- STEP 4: UPDATE RBAC FUNCTIONS TO USE USER_EMPLOYERS TABLE
-- =============================================================================

-- Drop existing functions to recreate with new logic
DROP FUNCTION IF EXISTS public.get_incidents_with_details_rbac CASCADE;
DROP FUNCTION IF EXISTS public.get_incidents_count_rbac CASCADE;
DROP FUNCTION IF EXISTS public.get_incident_metrics_rbac CASCADE;

-- -----------------------------------------------------------------------------
-- UPDATED FUNCTION: get_incidents_with_details_rbac
-- Now properly uses user_employers table for access control
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_incidents_with_details_rbac(
    page_size INTEGER DEFAULT 25,
    page_offset INTEGER DEFAULT 0,
    filter_employer_id INTEGER DEFAULT NULL,
    filter_worker_id INTEGER DEFAULT NULL,
    filter_start_date DATE DEFAULT NULL,
    filter_end_date DATE DEFAULT NULL,
    user_role_id INTEGER DEFAULT NULL,
    user_employer_id INTEGER DEFAULT NULL,
    p_user_id UUID DEFAULT NULL -- NEW: Pass actual user ID for employer lookup
)
RETURNS TABLE (
    incident_id integer,
    incident_number text,
    date_of_injury date,
    time_of_injury time,
    injury_type text,
    classification text,
    incident_status text,
    fatality boolean,
    injury_description text,
    returned_to_work boolean,
    total_days_lost integer,
    created_at timestamp with time zone,
    worker_id integer,
    worker_name text,
    worker_occupation text,
    employer_id integer,
    employer_name text,
    site_id integer,
    site_name text,
    document_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    allowed_employer_ids INTEGER[];
BEGIN
    -- Get user's allowed employers if user_id provided
    IF p_user_id IS NOT NULL AND user_role_id IS NOT NULL THEN
        allowed_employer_ids := get_user_employer_ids(p_user_id, user_role_id);
    END IF;
    
    RETURN QUERY
    WITH filtered_incidents AS (
        SELECT i.*
        FROM incidents i
        WHERE 
            -- Role-based filtering with user_employers support
            CASE 
                WHEN user_role_id IS NULL THEN true
                -- MEND roles (1-4) see everything
                WHEN user_role_id IN (1, 2, 3, 4) THEN true
                -- Other system roles see everything for now
                WHEN user_role_id IN (6, 7, 8) THEN true
                -- Builder Admin and Site roles use user_employers
                WHEN user_role_id IN (5, 9) THEN
                    CASE
                        -- If allowed_employer_ids is NULL (MEND staff), see all
                        WHEN allowed_employer_ids IS NULL THEN true
                        -- If empty array, no access
                        WHEN array_length(allowed_employer_ids, 1) = 0 THEN false
                        -- Otherwise check if incident employer is in allowed list
                        ELSE i.employer_id = ANY(allowed_employer_ids)
                    END
                -- Fallback to legacy employer_id if provided
                WHEN user_employer_id IS NOT NULL THEN i.employer_id = user_employer_id
                ELSE false
            END
            -- Apply additional filters
            AND (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
            AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
            AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
            AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
        ORDER BY i.date_of_injury DESC NULLS LAST, i.created_at DESC
        LIMIT page_size
        OFFSET page_offset
    )
    SELECT 
        fi.incident_id::integer,
        COALESCE(fi.incident_number, '')::text,
        fi.date_of_injury,
        fi.time_of_injury,
        COALESCE(fi.injury_type, '')::text,
        COALESCE(fi.classification, '')::text,
        COALESCE(fi.incident_status, 'Open')::text,
        COALESCE(fi.fatality, false),
        COALESCE(fi.injury_description, '')::text,
        COALESCE(fi.returned_to_work, false),
        COALESCE(fi.total_days_lost, 0),
        fi.created_at,
        w.worker_id::integer,
        COALESCE(CONCAT(w.given_name, ' ', w.family_name), '')::text AS worker_name,
        COALESCE(w.occupation, '')::text,
        e.employer_id::integer,
        COALESCE(e.employer_name, '')::text,
        s.site_id::integer,
        COALESCE(s.site_name, '')::text,
        (SELECT COUNT(*) FROM incident_documents id WHERE id.incident_id = fi.incident_id)::bigint
    FROM filtered_incidents fi
    LEFT JOIN workers w ON fi.worker_id = w.worker_id
    LEFT JOIN employers e ON fi.employer_id = e.employer_id
    LEFT JOIN sites s ON fi.site_id = s.site_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- UPDATED FUNCTION: get_incidents_count_rbac
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_incidents_count_rbac(
    filter_employer_id INTEGER DEFAULT NULL,
    filter_worker_id INTEGER DEFAULT NULL,
    filter_start_date DATE DEFAULT NULL,
    filter_end_date DATE DEFAULT NULL,
    user_role_id INTEGER DEFAULT NULL,
    user_employer_id INTEGER DEFAULT NULL,
    p_user_id UUID DEFAULT NULL -- NEW: Pass actual user ID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    incident_count INTEGER;
    allowed_employer_ids INTEGER[];
BEGIN
    -- Get user's allowed employers if user_id provided
    IF p_user_id IS NOT NULL AND user_role_id IS NOT NULL THEN
        allowed_employer_ids := get_user_employer_ids(p_user_id, user_role_id);
    END IF;
    
    SELECT COUNT(*)::INTEGER INTO incident_count
    FROM incidents i
    WHERE 
        -- Role-based filtering with user_employers support
        CASE 
            WHEN user_role_id IS NULL THEN true
            -- MEND roles see everything
            WHEN user_role_id IN (1, 2, 3, 4) THEN true
            -- Other system roles
            WHEN user_role_id IN (6, 7, 8) THEN true
            -- Builder Admin and Site roles
            WHEN user_role_id IN (5, 9) THEN
                CASE
                    WHEN allowed_employer_ids IS NULL THEN true
                    WHEN array_length(allowed_employer_ids, 1) = 0 THEN false
                    ELSE i.employer_id = ANY(allowed_employer_ids)
                END
            -- Fallback
            WHEN user_employer_id IS NOT NULL THEN i.employer_id = user_employer_id
            ELSE false
        END
        AND (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
        AND (filter_worker_id IS NULL OR i.worker_id = filter_worker_id)
        AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
        AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date);
    
    RETURN COALESCE(incident_count, 0);
END;
$$;

-- -----------------------------------------------------------------------------
-- UPDATED FUNCTION: get_incident_metrics_rbac
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_incident_metrics_rbac(
    user_role_id INTEGER DEFAULT NULL,
    user_employer_id INTEGER DEFAULT NULL,
    filter_employer_id INTEGER DEFAULT NULL,
    filter_start_date DATE DEFAULT NULL,
    filter_end_date DATE DEFAULT NULL,
    p_user_id UUID DEFAULT NULL -- NEW: Pass actual user ID
)
RETURNS TABLE (
    total_incidents INTEGER,
    avg_lost_time NUMERIC,
    total_lost_days INTEGER,
    total_claim_costs NUMERIC,
    psychosocial_count INTEGER,
    fatality_count INTEGER,
    lti_count INTEGER,
    mti_count INTEGER,
    fai_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    allowed_employer_ids INTEGER[];
BEGIN
    -- Get user's allowed employers if user_id provided
    IF p_user_id IS NOT NULL AND user_role_id IS NOT NULL THEN
        allowed_employer_ids := get_user_employer_ids(p_user_id, user_role_id);
    END IF;
    
    RETURN QUERY
    WITH filtered_incidents AS (
        SELECT 
            i.incident_id,
            i.total_days_lost,
            i.fatality,
            i.classification,
            COALESCE(i.total_claim_cost, 0) as claim_cost,
            CASE 
                WHEN i.psychosocial_flag = true THEN 1 
                ELSE 0 
            END as is_psychosocial
        FROM incidents i
        WHERE 
            -- Role-based filtering with user_employers support
            CASE 
                WHEN user_role_id IS NULL THEN true
                WHEN user_role_id IN (1, 2, 3, 4) THEN true
                WHEN user_role_id IN (6, 7, 8) THEN true
                WHEN user_role_id IN (5, 9) THEN
                    CASE
                        WHEN allowed_employer_ids IS NULL THEN true
                        WHEN array_length(allowed_employer_ids, 1) = 0 THEN false
                        ELSE i.employer_id = ANY(allowed_employer_ids)
                    END
                WHEN user_employer_id IS NOT NULL THEN i.employer_id = user_employer_id
                ELSE false
            END
            AND (filter_employer_id IS NULL OR i.employer_id = filter_employer_id)
            AND (filter_start_date IS NULL OR i.date_of_injury >= filter_start_date)
            AND (filter_end_date IS NULL OR i.date_of_injury <= filter_end_date)
    )
    SELECT
        COUNT(*)::INTEGER as total_incidents,
        ROUND(AVG(COALESCE(total_days_lost, 0))::NUMERIC, 1) as avg_lost_time,
        SUM(COALESCE(total_days_lost, 0))::INTEGER as total_lost_days,
        SUM(claim_cost)::NUMERIC as total_claim_costs,
        SUM(is_psychosocial)::INTEGER as psychosocial_count,
        SUM(CASE WHEN fatality = true THEN 1 ELSE 0 END)::INTEGER as fatality_count,
        SUM(CASE WHEN classification = 'LTI' THEN 1 ELSE 0 END)::INTEGER as lti_count,
        SUM(CASE WHEN classification = 'MTI' THEN 1 ELSE 0 END)::INTEGER as mti_count,
        SUM(CASE WHEN classification = 'FAI' THEN 1 ELSE 0 END)::INTEGER as fai_count
    FROM filtered_incidents;
END;
$$;

-- =============================================================================
-- STEP 5: CREATE MANAGEMENT FUNCTIONS
-- =============================================================================

-- Function to assign a user to an employer
CREATE OR REPLACE FUNCTION public.assign_user_to_employer(
    p_user_id UUID,
    p_employer_id INTEGER,
    p_is_primary BOOLEAN DEFAULT false,
    p_assigned_by UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If marking as primary, unset other primary assignments
    IF p_is_primary THEN
        UPDATE public.user_employers 
        SET is_primary = false 
        WHERE user_id = p_user_id AND is_primary = true;
    END IF;
    
    -- Insert or update the assignment
    INSERT INTO public.user_employers (user_id, employer_id, is_primary, assigned_by, notes)
    VALUES (p_user_id, p_employer_id, p_is_primary, p_assigned_by, p_notes)
    ON CONFLICT (user_id, employer_id) 
    DO UPDATE SET 
        is_primary = EXCLUDED.is_primary,
        assigned_at = NOW(),
        assigned_by = EXCLUDED.assigned_by,
        notes = EXCLUDED.notes;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- Function to remove a user from an employer
CREATE OR REPLACE FUNCTION public.remove_user_from_employer(
    p_user_id UUID,
    p_employer_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.user_employers
    WHERE user_id = p_user_id AND employer_id = p_employer_id;
    
    RETURN FOUND;
END;
$$;

-- Function to get a user's primary employer
CREATE OR REPLACE FUNCTION public.get_user_primary_employer(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    primary_employer_id INTEGER;
BEGIN
    SELECT employer_id INTO primary_employer_id
    FROM public.user_employers
    WHERE user_id = p_user_id AND is_primary = true
    LIMIT 1;
    
    -- If no primary marked, return the first employer
    IF primary_employer_id IS NULL THEN
        SELECT employer_id INTO primary_employer_id
        FROM public.user_employers
        WHERE user_id = p_user_id
        ORDER BY assigned_at ASC
        LIMIT 1;
    END IF;
    
    RETURN primary_employer_id;
END;
$$;

-- =============================================================================
-- STEP 6: GRANT PERMISSIONS
-- =============================================================================
GRANT ALL ON TABLE public.user_employers TO authenticated;
GRANT ALL ON TABLE public.user_employers TO service_role;
GRANT SELECT ON TABLE public.user_employers TO anon;

GRANT ALL ON SEQUENCE public.user_employers_user_employer_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.user_employers_user_employer_id_seq TO service_role;

GRANT EXECUTE ON FUNCTION public.get_user_employer_ids TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_employer_ids TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_employer_ids TO service_role;

GRANT EXECUTE ON FUNCTION public.assign_user_to_employer TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_to_employer TO service_role;

GRANT EXECUTE ON FUNCTION public.remove_user_from_employer TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_from_employer TO service_role;

GRANT EXECUTE ON FUNCTION public.get_user_primary_employer TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_primary_employer TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_primary_employer TO service_role;

-- Re-grant permissions on updated RBAC functions
GRANT EXECUTE ON FUNCTION public.get_incidents_with_details_rbac TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incidents_with_details_rbac TO anon;
GRANT EXECUTE ON FUNCTION public.get_incidents_count_rbac TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incidents_count_rbac TO anon;
GRANT EXECUTE ON FUNCTION public.get_incident_metrics_rbac TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incident_metrics_rbac TO anon;

-- =============================================================================
-- STEP 7: ADD DOCUMENTATION
-- =============================================================================
COMMENT ON FUNCTION public.get_incidents_with_details_rbac IS 
'UPDATED: RBAC function now uses user_employers table for proper multi-employer support.
Roles 1-4 (MEND staff) see all data without needing entries in user_employers.
Role 5 (Builder Admin) and others use user_employers for access control.';

COMMENT ON FUNCTION public.assign_user_to_employer IS 
'Assigns a user to an employer. Can mark as primary employer.
Automatically handles unsetting other primary assignments when needed.';

COMMENT ON FUNCTION public.remove_user_from_employer IS 
'Removes a user''s access to a specific employer.';

COMMENT ON FUNCTION public.get_user_primary_employer IS 
'Gets the primary employer for a user. Returns first employer if no primary is set.';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- This migration:
-- 1. Creates the user_employers table for proper many-to-many relationships
-- 2. Migrates existing employer assignments from the users table
-- 3. Updates all RBAC functions to use the new table
-- 4. Provides management functions for user-employer assignments
-- 5. Properly handles MEND staff who don't need employer restrictions