-- Migration: Clerk Third-Party Auth Integration
-- This migration sets up proper RLS support for Clerk's Third-Party Auth integration with Supabase.
-- 
-- Key changes:
-- 1. Creates get_requesting_user_id() - maps JWT sub claim (Clerk ID) to database user_id
-- 2. Creates get_requesting_clerk_id() - gets the raw Clerk ID from JWT
-- 3. Drops the old check_clerk_auth() workaround function
-- 4. Updates RLS policies to use the new helper functions
--
-- With Third-Party Auth, Clerk JWTs are passed directly to PostgREST.
-- The JWT's `sub` claim contains the Clerk user ID (e.g., "user_2q...")
-- We use auth.jwt() to access claims directly in RLS policies.

-- ============================================================================
-- DROP OLD POLICIES FIRST (before dropping functions they depend on)
-- ============================================================================

DROP POLICY IF EXISTS "staff_manage_medical_centers" ON "public"."medical_centers";
DROP POLICY IF EXISTS "authenticated_read_medical_centers" ON "public"."medical_centers";

-- ============================================================================
-- DROP OLD WORKAROUND FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.check_clerk_auth();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get the Clerk user ID from the JWT's sub claim
-- This is the raw Clerk ID string (e.g., "user_2q...")
CREATE OR REPLACE FUNCTION public.get_requesting_clerk_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'sub',
    current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
  );
$$;

COMMENT ON FUNCTION public.get_requesting_clerk_id() IS 
'Returns the Clerk user ID (sub claim) from the current JWT. 
Used for matching against users.clerk_user_id in RLS policies.';

-- Get the database user_id (UUID) for the requesting user
-- Maps the JWT's sub claim (Clerk ID) to our users table's user_id
CREATE OR REPLACE FUNCTION public.get_requesting_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT u.user_id
  FROM users u
  WHERE u.clerk_user_id = public.get_requesting_clerk_id()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_requesting_user_id() IS 
'Returns the database user_id (UUID) for the current authenticated user.
Maps the Clerk user ID from the JWT to our users table.
Use this in RLS policies instead of auth.uid() when using Clerk Third-Party Auth.';

-- Get the email from the JWT
CREATE OR REPLACE FUNCTION public.get_requesting_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'email',
    current_setting('request.jwt.claims', true)::jsonb ->> 'email'
  );
$$;

COMMENT ON FUNCTION public.get_requesting_email() IS 
'Returns the email from the current JWT.';

-- Get the role_id for the requesting user
CREATE OR REPLACE FUNCTION public.get_requesting_role_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT u.role_id
  FROM users u
  WHERE u.clerk_user_id = public.get_requesting_clerk_id()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_requesting_role_id() IS 
'Returns the role_id for the current authenticated user.';

-- Check if the requesting user is staff (roles 1-6)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(public.get_requesting_role_id() IN (1, 2, 3, 4, 5, 6), FALSE);
$$;

COMMENT ON FUNCTION public.is_staff() IS 
'Returns true if the current user is staff (role_id 1-6).';

-- Check if the requesting user is a builder (roles 3-4)
CREATE OR REPLACE FUNCTION public.is_builder()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(public.get_requesting_role_id() IN (3, 4), FALSE);
$$;

COMMENT ON FUNCTION public.is_builder() IS 
'Returns true if the current user is a builder (role_id 3-4).';

-- Check if the requesting user is Mend staff (roles 1-2)
CREATE OR REPLACE FUNCTION public.is_mend_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(public.get_requesting_role_id() IN (1, 2), FALSE);
$$;

COMMENT ON FUNCTION public.is_mend_staff() IS 
'Returns true if the current user is Mend staff (role_id 1-2).';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_requesting_clerk_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_requesting_clerk_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_requesting_clerk_id() TO anon;

GRANT EXECUTE ON FUNCTION public.get_requesting_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_requesting_user_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_requesting_user_id() TO anon;

GRANT EXECUTE ON FUNCTION public.get_requesting_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_requesting_email() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_requesting_email() TO anon;

GRANT EXECUTE ON FUNCTION public.get_requesting_role_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_requesting_role_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_requesting_role_id() TO anon;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO anon;

GRANT EXECUTE ON FUNCTION public.is_builder() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_builder() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_builder() TO anon;

GRANT EXECUTE ON FUNCTION public.is_mend_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_mend_staff() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_mend_staff() TO anon;

-- ============================================================================
-- CREATE NEW RLS POLICIES FOR MEDICAL_CENTERS
-- ============================================================================

-- Create clean policy using new helper functions
CREATE POLICY "staff_manage_medical_centers"
ON "public"."medical_centers"
FOR ALL
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- Read access for all authenticated users
CREATE POLICY "authenticated_read_medical_centers"
ON "public"."medical_centers"
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- VERIFICATION QUERY (run manually to test)
-- ============================================================================
-- After applying this migration, you can test with:
--
-- SELECT 
--   public.get_requesting_clerk_id() as clerk_id,
--   public.get_requesting_user_id() as user_id,
--   public.get_requesting_email() as email,
--   public.get_requesting_role_id() as role_id,
--   public.is_staff() as is_staff;

