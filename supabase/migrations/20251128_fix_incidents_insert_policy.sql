-- Fix RLS policies to allow authenticated users to INSERT new incidents and workers
-- The issue is that the current "FOR ALL" policies require employer_id to match,
-- but when creating a new record, employer_id might not be set yet (e.g., for drafts)

-- =====================================================
-- INCIDENTS TABLE
-- =====================================================

-- Drop ALL conflicting policies including the old role-based ones
DROP POLICY IF EXISTS "mend_staff_manage_incidents" ON public.incidents;
DROP POLICY IF EXISTS "company_users_manage_incidents" ON public.incidents;
DROP POLICY IF EXISTS "authenticated_insert_incidents" ON public.incidents;
DROP POLICY IF EXISTS "mend_staff_update_incidents" ON public.incidents;
DROP POLICY IF EXISTS "company_users_update_incidents" ON public.incidents;
DROP POLICY IF EXISTS "mend_staff_delete_incidents" ON public.incidents;
DROP POLICY IF EXISTS "company_users_delete_incidents" ON public.incidents;
-- These were the conflicting policies using get_my_role() function
DROP POLICY IF EXISTS "incidents_insert_policy" ON public.incidents;
DROP POLICY IF EXISTS "incidents_select_policy" ON public.incidents;
DROP POLICY IF EXISTS "incidents_update_policy" ON public.incidents;
DROP POLICY IF EXISTS "incidents_delete_policy" ON public.incidents;

-- Allow any authenticated user to INSERT new incidents
-- This is needed for:
-- 1. Creating new incident reports
-- 2. Saving drafts
-- 3. Voice agent creating incidents
CREATE POLICY "authenticated_insert_incidents"
ON public.incidents FOR INSERT TO authenticated
WITH CHECK (true);

-- Mend staff (roles 1, 2, 3) can UPDATE/DELETE any incident
CREATE POLICY "mend_staff_update_incidents"
ON public.incidents FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)))
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "mend_staff_delete_incidents"
ON public.incidents FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

-- Company users (role >= 4) can UPDATE/DELETE their own employer's incidents
CREATE POLICY "company_users_update_incidents"
ON public.incidents FOR UPDATE TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL))
WITH CHECK (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL));

CREATE POLICY "company_users_delete_incidents"
ON public.incidents FOR DELETE TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL));

-- Ensure GRANT is in place
GRANT INSERT, UPDATE, DELETE ON public.incidents TO authenticated;

-- =====================================================
-- WORKERS TABLE
-- =====================================================

-- Drop existing manage policies and recreate with separate INSERT policy
DROP POLICY IF EXISTS "authenticated_insert_workers" ON public.workers;
DROP POLICY IF EXISTS "mend_staff_manage_workers" ON public.workers;
DROP POLICY IF EXISTS "builder_admin_manage_workers" ON public.workers;
DROP POLICY IF EXISTS "mend_staff_update_workers" ON public.workers;
DROP POLICY IF EXISTS "mend_staff_delete_workers" ON public.workers;
DROP POLICY IF EXISTS "company_users_update_workers" ON public.workers;
DROP POLICY IF EXISTS "company_users_delete_workers" ON public.workers;

-- Allow any authenticated user to INSERT new workers
CREATE POLICY "authenticated_insert_workers"
ON public.workers FOR INSERT TO authenticated
WITH CHECK (true);

-- Mend staff (roles 1, 2, 3) can UPDATE/DELETE any worker
CREATE POLICY "mend_staff_update_workers"
ON public.workers FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)))
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "mend_staff_delete_workers"
ON public.workers FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

-- Company users can UPDATE/DELETE their own employer's workers
CREATE POLICY "company_users_update_workers"
ON public.workers FOR UPDATE TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL))
WITH CHECK (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL));

CREATE POLICY "company_users_delete_workers"
ON public.workers FOR DELETE TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL));

-- Ensure GRANT is in place
GRANT INSERT, UPDATE, DELETE ON public.workers TO authenticated;

-- =====================================================
-- FIX: Add 'Draft' to incident_status CHECK constraint
-- =====================================================
ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS check_incident_status;

ALTER TABLE public.incidents ADD CONSTRAINT check_incident_status 
CHECK (incident_status = ANY (ARRAY[
  'Draft',
  'Open', 
  'Under Investigation', 
  'Awaiting Documentation', 
  'In Review', 
  'Closed', 
  'Resolved', 
  'Reopened', 
  'Escalated'
]));

-- =====================================================
-- FIX: Update LTI trigger to handle NULL employer_id (for drafts)
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_update_lti_rate()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip LTI calculation for drafts or when employer_id is NULL
    IF NEW.employer_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    IF TG_TABLE_NAME = 'hours_worked' THEN
        PERFORM calculate_lti_rate(NEW.employer_id, NEW.month);
    ELSIF TG_TABLE_NAME = 'incidents' THEN
        -- Also skip if date_of_injury is NULL (incomplete data)
        IF NEW.date_of_injury IS NOT NULL THEN
            PERFORM calculate_lti_rate(NEW.employer_id, (DATE_TRUNC('month', NEW.date_of_injury))::date);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIX: Add SELECT policy for incidents with NULL employer_id
-- =====================================================
DROP POLICY IF EXISTS "users_view_own_created_incidents" ON public.incidents;

CREATE POLICY "users_view_own_created_incidents"
ON public.incidents FOR SELECT TO authenticated
USING (
  -- Allow if employer_id is NULL (drafts) - any authenticated user can see drafts they might have created
  employer_id IS NULL
  OR
  -- Allow Mend staff to view all (roles 1-3)
  EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3))
  OR
  -- Allow company users to view their employer's incidents
  employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL)
);

-- =====================================================
-- FIX: SECURITY DEFINER function to bypass RLS for incident creation
-- This is necessary because company users can create incidents for any employer
-- but can only SELECT incidents for their own employer
-- =====================================================
DROP FUNCTION IF EXISTS create_incident_bypassing_rls(JSONB);

CREATE OR REPLACE FUNCTION create_incident_bypassing_rls(p_incident_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident_id INTEGER;
  v_result JSONB;
BEGIN
  -- Insert the incident with all provided fields
  INSERT INTO incidents (
    incident_status,
    employer_id,
    worker_id,
    site_id,
    injury_type,
    injury_description,
    date_of_injury,
    time_of_injury,
    notifying_person_name,
    notifying_person_position,
    notifying_person_telephone,
    workers_employer,
    case_notes,
    witness,
    referral,
    doctor_details,
    doctor_id,
    actions,
    body_part_id,
    body_side_id,
    moi_code_id,
    bl_code_id,
    treatment_provided,
    shift_arrangement
  )
  VALUES (
    COALESCE(p_incident_data->>'incident_status', 'Open'),
    NULLIF(p_incident_data->>'employer_id', '')::INTEGER,
    NULLIF(p_incident_data->>'worker_id', '')::INTEGER,
    NULLIF(p_incident_data->>'site_id', '')::INTEGER,
    p_incident_data->>'injury_type',
    p_incident_data->>'injury_description',
    NULLIF(p_incident_data->>'date_of_injury', '')::DATE,
    NULLIF(p_incident_data->>'time_of_injury', '')::TIME,
    p_incident_data->>'notifying_person_name',
    p_incident_data->>'notifying_person_position',
    p_incident_data->>'notifying_person_telephone',
    p_incident_data->>'workers_employer',
    p_incident_data->>'case_notes',
    p_incident_data->>'witness',
    p_incident_data->>'referral',
    p_incident_data->>'doctor_details',
    NULLIF(p_incident_data->>'doctor_id', '')::INTEGER,
    p_incident_data->>'actions',
    NULLIF(p_incident_data->>'body_part_id', '')::INTEGER,
    NULLIF(p_incident_data->>'body_side_id', '')::INTEGER,
    NULLIF(p_incident_data->>'moi_code_id', '')::INTEGER,
    NULLIF(p_incident_data->>'bl_code_id', '')::INTEGER,
    p_incident_data->>'treatment_provided',
    p_incident_data->>'shift_arrangement'
  )
  RETURNING incident_id INTO v_incident_id;
  
  -- Return success with the incident_id
  v_result := jsonb_build_object(
    'success', true,
    'incident_id', v_incident_id
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  -- Return error details for debugging
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$;

-- Grant execute to all roles that need to create incidents
GRANT EXECUTE ON FUNCTION create_incident_bypassing_rls(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_incident_bypassing_rls(JSONB) TO anon;

