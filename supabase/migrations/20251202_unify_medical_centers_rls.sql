-- Update RLS policies for medical_centers to allow all Staff (roles 1-6) to manage medical centers
-- Also use case-insensitive email comparison for better reliability

-- Drop existing policies to clean up
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
    WHERE lower(u.email) = lower(auth.jwt() ->> 'email')
    AND u.role_id IN (1, 2, 3, 4, 5, 6)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE lower(u.email) = lower(auth.jwt() ->> 'email')
    AND u.role_id IN (1, 2, 3, 4, 5, 6)
  )
);

-- Ensure basic read access for all authenticated users (needed for dropdowns etc)
CREATE POLICY "authenticated_read_medical_centers"
ON "public"."medical_centers"
FOR SELECT
TO authenticated
USING (true);

