-- =====================================================
-- FIX SITES TABLE RLS POLICIES
-- Date: 2025-11-25
-- Purpose: Ensure super admins can view all sites
-- =====================================================

-- First, ensure RLS is enabled on sites table
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view sites" ON public.sites;
DROP POLICY IF EXISTS "Super admins can view all sites" ON public.sites;
DROP POLICY IF EXISTS "Users can view own employer sites" ON public.sites;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.sites;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.sites;

-- Create a permissive policy that allows authenticated users to read all sites
-- This is needed because site data is generally not sensitive and needed for dropdowns
CREATE POLICY "Allow read access to all authenticated users"
ON public.sites
FOR SELECT
TO authenticated
USING (true);

-- Allow super admins (roles 1-4) to insert/update/delete sites
CREATE POLICY "Super admins can manage sites"
ON public.sites
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3, 4)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3, 4)
  )
);

-- Grant necessary permissions
GRANT SELECT ON public.sites TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sites TO authenticated;

-- Also ensure site_status_history has proper policies
ALTER TABLE IF EXISTS public.site_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to site_status_history" ON public.site_status_history;

CREATE POLICY "Allow read access to site_status_history"
ON public.site_status_history
FOR SELECT
TO authenticated
USING (true);

GRANT SELECT ON public.site_status_history TO authenticated;

-- =====================================================
-- Verification
-- =====================================================
-- After running this migration, run:
-- SELECT COUNT(*) FROM sites;
-- to verify sites are accessible

