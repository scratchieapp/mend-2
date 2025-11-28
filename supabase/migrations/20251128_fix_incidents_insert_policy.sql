-- Fix RLS policy to allow authenticated users to INSERT new incidents
-- The issue is that the current "FOR ALL" policies require employer_id to match,
-- but when creating a new incident, employer_id might not be set yet (e.g., for drafts)

-- Drop existing manage policies and recreate with separate INSERT policy
DROP POLICY IF EXISTS "mend_staff_manage_incidents" ON public.incidents;
DROP POLICY IF EXISTS "company_users_manage_incidents" ON public.incidents;
DROP POLICY IF EXISTS "authenticated_insert_incidents" ON public.incidents;
DROP POLICY IF EXISTS "mend_staff_update_incidents" ON public.incidents;
DROP POLICY IF EXISTS "company_users_update_incidents" ON public.incidents;
DROP POLICY IF EXISTS "mend_staff_delete_incidents" ON public.incidents;
DROP POLICY IF EXISTS "company_users_delete_incidents" ON public.incidents;

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

