-- =====================================================
-- USERS TABLE RLS POLICIES
-- Date: 2025-11-27
-- Purpose: Implement proper RLS for users table
-- Roles 1-3 (MEND Staff) can see all users
-- Roles 4+ can only see users from their employer
-- =====================================================

-- First, ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view employer users" ON public.users;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_access_policy" ON public.users;
DROP POLICY IF EXISTS "mend_staff_view_all_users" ON public.users;
DROP POLICY IF EXISTS "company_users_view_own_employer" ON public.users;

-- =============================================================
-- SELECT POLICY: Who can view users
-- =============================================================
-- Policy 1: MEND Staff (roles 1-3) can view ALL users
CREATE POLICY "mend_staff_view_all_users"
ON public.users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

-- Policy 2: Company users (roles 4+) can only view users from their employer
CREATE POLICY "company_users_view_own_employer"
ON public.users
FOR SELECT
TO authenticated
USING (
  -- User can always see themselves
  email = auth.jwt()->>'email'
  OR
  -- Or they can see users from the same employer if they're role 4+
  (
    employer_id IS NOT NULL
    AND employer_id IN (
      SELECT u.employer_id FROM public.users u
      WHERE u.email = auth.jwt()->>'email'
      AND u.role_id >= 4
      AND u.employer_id IS NOT NULL
    )
  )
);

-- =============================================================
-- INSERT POLICY: Who can create users
-- =============================================================
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "mend_staff_create_users" ON public.users;
DROP POLICY IF EXISTS "company_admins_create_users" ON public.users;

-- Only MEND Staff (roles 1-3) can create any user
CREATE POLICY "mend_staff_create_users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

-- Builder Admins (role 5) can create users within their employer
CREATE POLICY "builder_admin_create_users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id = 5
    AND u.employer_id IS NOT NULL
  )
  -- The new user must be in the same employer and have role >= 5
  AND employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id = 5
  )
  AND role_id >= 5
);

-- =============================================================
-- UPDATE POLICY: Who can update users
-- =============================================================
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "mend_staff_update_users" ON public.users;
DROP POLICY IF EXISTS "company_admins_update_users" ON public.users;

-- MEND Staff (roles 1-3) can update any user
CREATE POLICY "mend_staff_update_users"
ON public.users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

-- Builder Admins (role 5) can update users within their employer (but not promote to admin)
CREATE POLICY "builder_admin_update_users"
ON public.users
FOR UPDATE
TO authenticated
USING (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id = 5
    AND u.employer_id IS NOT NULL
  )
)
WITH CHECK (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id = 5
    AND u.employer_id IS NOT NULL
  )
  -- Cannot set role lower than 5
  AND role_id >= 5
);

-- Users can update their own profile (limited fields handled by application)
CREATE POLICY "users_update_own_profile"
ON public.users
FOR UPDATE
TO authenticated
USING (email = auth.jwt()->>'email')
WITH CHECK (email = auth.jwt()->>'email');

-- =============================================================
-- DELETE POLICY: Who can delete users
-- =============================================================
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
DROP POLICY IF EXISTS "mend_staff_delete_users" ON public.users;

-- Only Super Admin (role 1) can delete users
CREATE POLICY "super_admin_delete_users"
ON public.users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id = 1
  )
);

-- =============================================================
-- Grant necessary permissions
-- =============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;

