-- Update RLS policies for medical_centers to allow Site Admins (role_id = 6) to manage medical centers

-- Drop existing policies for builder admin
DROP POLICY IF EXISTS "builder_admin_insert_medical_centers" ON "public"."medical_centers";
DROP POLICY IF EXISTS "builder_admin_update_medical_centers" ON "public"."medical_centers";

-- Re-create policies including role_id 6 (Site Admin)
CREATE POLICY "builder_site_admin_insert_medical_centers"
ON "public"."medical_centers"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.email = auth.jwt() ->> 'email'
    AND u.role_id IN (5, 6)
  )
);

CREATE POLICY "builder_site_admin_update_medical_centers"
ON "public"."medical_centers"
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.email = auth.jwt() ->> 'email'
    AND u.role_id IN (5, 6)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.email = auth.jwt() ->> 'email'
    AND u.role_id IN (5, 6)
  )
);

