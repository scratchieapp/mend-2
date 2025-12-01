-- Update RLS policies for medical_centers to allow all Staff (roles 1-6) to manage medical centers
-- robustly checking against Email, Clerk ID (sub), or Supabase Auth UID

-- Drop existing unified policy if it exists (and others just in case)
DROP POLICY IF EXISTS "staff_manage_medical_centers" ON "public"."medical_centers";
DROP POLICY IF EXISTS "builder_admin_insert_medical_centers" ON "public"."medical_centers";
DROP POLICY IF EXISTS "builder_admin_update_medical_centers" ON "public"."medical_centers";
DROP POLICY IF EXISTS "builder_site_admin_insert_medical_centers" ON "public"."medical_centers";
DROP POLICY IF EXISTS "builder_site_admin_update_medical_centers" ON "public"."medical_centers";
DROP POLICY IF EXISTS "mend_staff_manage_medical_centers" ON "public"."medical_centers";
DROP POLICY IF EXISTS "authenticated_insert_medical_centers" ON "public"."medical_centers";
DROP POLICY IF EXISTS "authenticated_update_medical_centers" ON "public"."medical_centers";

-- Create unified policy for staff (roles 1-6)
CREATE POLICY "staff_manage_medical_centers"
ON "public"."medical_centers"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE (
      -- Match by Email (Legacy/Supabase Auth) - Case Insensitive
      (auth.jwt() ->> 'email' IS NOT NULL AND lower(u.email) = lower(auth.jwt() ->> 'email'))
      OR
      -- Match by Clerk ID (Clerk Auth stores this in 'sub')
      (auth.jwt() ->> 'sub' IS NOT NULL AND u.clerk_user_id = (auth.jwt() ->> 'sub'))
      OR
      -- Match by Supabase User ID
      (auth.uid() IS NOT NULL AND u.user_id = auth.uid())
    )
    AND u.role_id IN (1, 2, 3, 4, 5, 6)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE (
      -- Match by Email (Legacy/Supabase Auth) - Case Insensitive
      (auth.jwt() ->> 'email' IS NOT NULL AND lower(u.email) = lower(auth.jwt() ->> 'email'))
      OR
      -- Match by Clerk ID (Clerk Auth stores this in 'sub')
      (auth.jwt() ->> 'sub' IS NOT NULL AND u.clerk_user_id = (auth.jwt() ->> 'sub'))
      OR
      -- Match by Supabase User ID
      (auth.uid() IS NOT NULL AND u.user_id = auth.uid())
    )
    AND u.role_id IN (1, 2, 3, 4, 5, 6)
  )
);

-- Ensure basic read access for all authenticated users
-- (Re-applying to be safe, ensuring no conflicts)
DROP POLICY IF EXISTS "Allow read access to medical_centers" ON "public"."medical_centers";
DROP POLICY IF EXISTS "authenticated_read_medical_centers" ON "public"."medical_centers";

CREATE POLICY "authenticated_read_medical_centers"
ON "public"."medical_centers"
FOR SELECT
TO authenticated
USING (true);

