-- Add INSERT/UPDATE policies for medical_centers table
-- Medical centers are global reference data that can be created by any authenticated user

-- Drop old conflicting policies
DROP POLICY IF EXISTS "Only super admins can modify medical centers" ON public.medical_centers;
DROP POLICY IF EXISTS "mend_staff_manage_medical_centers" ON public.medical_centers;
DROP POLICY IF EXISTS "builder_admin_insert_medical_centers" ON public.medical_centers;
DROP POLICY IF EXISTS "builder_admin_update_medical_centers" ON public.medical_centers;

-- Allow any authenticated user to insert medical centers (they're global reference data)
DROP POLICY IF EXISTS "authenticated_insert_medical_centers" ON public.medical_centers;
CREATE POLICY "authenticated_insert_medical_centers"
ON public.medical_centers FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow any authenticated user to update medical centers
DROP POLICY IF EXISTS "authenticated_update_medical_centers" ON public.medical_centers;
CREATE POLICY "authenticated_update_medical_centers"
ON public.medical_centers FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Also add similar policies for medical_professionals (doctors)
DROP POLICY IF EXISTS "mend_staff_manage_medical_professionals" ON public.medical_professionals;
DROP POLICY IF EXISTS "builder_admin_insert_medical_professionals" ON public.medical_professionals;

-- Allow any authenticated user to insert/update medical professionals
DROP POLICY IF EXISTS "authenticated_insert_medical_professionals" ON public.medical_professionals;
CREATE POLICY "authenticated_insert_medical_professionals"
ON public.medical_professionals FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_medical_professionals" ON public.medical_professionals;
CREATE POLICY "authenticated_update_medical_professionals"
ON public.medical_professionals FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

