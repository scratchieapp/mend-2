-- Add INSERT/UPDATE policies for medical_centers table
-- Medical centers are global reference data that can be created by Mend staff or Builder Admins

-- Drop old conflicting policy that used auth.uid() instead of auth.jwt()->>'email'
DROP POLICY IF EXISTS "Only super admins can modify medical centers" ON public.medical_centers;

-- Allow Mend staff to fully manage medical_centers
DROP POLICY IF EXISTS "mend_staff_manage_medical_centers" ON public.medical_centers;
CREATE POLICY "mend_staff_manage_medical_centers"
ON public.medical_centers FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)  -- Super Admin, Senior Mend Staff, Mend Staff
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

-- Allow Builder Admins to insert new medical centers (they're global reference data)
DROP POLICY IF EXISTS "builder_admin_insert_medical_centers" ON public.medical_centers;
CREATE POLICY "builder_admin_insert_medical_centers"
ON public.medical_centers FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id = 5  -- Builder Admin
  )
);

-- Allow Builder Admins to update medical centers they might need to correct
DROP POLICY IF EXISTS "builder_admin_update_medical_centers" ON public.medical_centers;
CREATE POLICY "builder_admin_update_medical_centers"
ON public.medical_centers FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id = 5  -- Builder Admin
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id = 5
  )
);

-- Also add similar policies for medical_professionals (doctors)
DROP POLICY IF EXISTS "mend_staff_manage_medical_professionals" ON public.medical_professionals;
CREATE POLICY "mend_staff_manage_medical_professionals"
ON public.medical_professionals FOR ALL TO authenticated
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

DROP POLICY IF EXISTS "builder_admin_insert_medical_professionals" ON public.medical_professionals;
CREATE POLICY "builder_admin_insert_medical_professionals"
ON public.medical_professionals FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id = 5
  )
);

