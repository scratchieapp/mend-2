-- =====================================================
-- COMPREHENSIVE RLS POLICIES FOR ALL TABLES
-- Date: 2025-11-27
-- Purpose: Implement proper RLS for all tables
-- 
-- Access Levels:
-- - Roles 1-3 (MEND Staff): Can see all data
-- - Roles 4+ (Company Users): Can only see their employer's data
-- =====================================================

-- =====================================================
-- SECTION 1: REFERENCE TABLES (Read-only for all authenticated)
-- These are lookup tables that all users need access to
-- =====================================================

-- employers - All authenticated users can read (for dropdowns)
ALTER TABLE public.employers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to employers" ON public.employers;
DROP POLICY IF EXISTS "Mend staff manage employers" ON public.employers;

CREATE POLICY "Allow read access to employers"
ON public.employers FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Mend staff manage employers"
ON public.employers FOR ALL TO authenticated
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

-- user_roles - All authenticated users can read
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to user_roles" ON public.user_roles;

CREATE POLICY "Allow read access to user_roles"
ON public.user_roles FOR SELECT TO authenticated
USING (true);

-- departments - All authenticated users can read
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to departments" ON public.departments;
DROP POLICY IF EXISTS "Mend staff manage departments" ON public.departments;

CREATE POLICY "Allow read access to departments"
ON public.departments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Mend staff manage departments"
ON public.departments FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

-- actions_taken - Reference table
ALTER TABLE public.actions_taken ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to actions_taken" ON public.actions_taken;

CREATE POLICY "Allow read access to actions_taken"
ON public.actions_taken FOR SELECT TO authenticated
USING (true);

-- agency_of_injury_codes - Reference table
ALTER TABLE public.agency_of_injury_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to agency_of_injury_codes" ON public.agency_of_injury_codes;

CREATE POLICY "Allow read access to agency_of_injury_codes"
ON public.agency_of_injury_codes FOR SELECT TO authenticated
USING (true);

-- bodily_location_codes - Reference table
ALTER TABLE public.bodily_location_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to bodily_location_codes" ON public.bodily_location_codes;

CREATE POLICY "Allow read access to bodily_location_codes"
ON public.bodily_location_codes FOR SELECT TO authenticated
USING (true);

-- body_parts - Reference table
ALTER TABLE public.body_parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to body_parts" ON public.body_parts;

CREATE POLICY "Allow read access to body_parts"
ON public.body_parts FOR SELECT TO authenticated
USING (true);

-- body_parts_bodily_codes - Reference table
ALTER TABLE public.body_parts_bodily_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to body_parts_bodily_codes" ON public.body_parts_bodily_codes;

CREATE POLICY "Allow read access to body_parts_bodily_codes"
ON public.body_parts_bodily_codes FOR SELECT TO authenticated
USING (true);

-- body_sides - Reference table
ALTER TABLE public.body_sides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to body_sides" ON public.body_sides;

CREATE POLICY "Allow read access to body_sides"
ON public.body_sides FOR SELECT TO authenticated
USING (true);

-- claim_types - Reference table
ALTER TABLE public.claim_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to claim_types" ON public.claim_types;

CREATE POLICY "Allow read access to claim_types"
ON public.claim_types FOR SELECT TO authenticated
USING (true);

-- cost_assumptions - Reference table
ALTER TABLE public.cost_assumptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to cost_assumptions" ON public.cost_assumptions;

CREATE POLICY "Allow read access to cost_assumptions"
ON public.cost_assumptions FOR SELECT TO authenticated
USING (true);

-- =====================================================
-- SECTION 2: DATA TABLES WITH EMPLOYER-BASED RLS
-- These tables contain company-specific data
-- =====================================================

-- sites - Employer-based access
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_sites" ON public.sites;
DROP POLICY IF EXISTS "company_users_view_own_sites" ON public.sites;
DROP POLICY IF EXISTS "mend_staff_manage_sites" ON public.sites;
DROP POLICY IF EXISTS "builder_admin_manage_sites" ON public.sites;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.sites;
DROP POLICY IF EXISTS "Super admins can manage sites" ON public.sites;

-- SELECT: MEND Staff see all, company users see their employer's sites
CREATE POLICY "mend_staff_view_all_sites"
ON public.sites FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

CREATE POLICY "company_users_view_own_sites"
ON public.sites FOR SELECT TO authenticated
USING (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
);

-- INSERT/UPDATE/DELETE: MEND Staff can manage all, Builder Admin can manage own
CREATE POLICY "mend_staff_manage_sites"
ON public.sites FOR ALL TO authenticated
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

CREATE POLICY "builder_admin_manage_sites"
ON public.sites FOR ALL TO authenticated
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
);

-- workers - Employer-based access
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_workers" ON public.workers;
DROP POLICY IF EXISTS "company_users_view_own_workers" ON public.workers;
DROP POLICY IF EXISTS "mend_staff_manage_workers" ON public.workers;
DROP POLICY IF EXISTS "builder_admin_manage_workers" ON public.workers;

CREATE POLICY "mend_staff_view_all_workers"
ON public.workers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

CREATE POLICY "company_users_view_own_workers"
ON public.workers FOR SELECT TO authenticated
USING (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
);

CREATE POLICY "mend_staff_manage_workers"
ON public.workers FOR ALL TO authenticated
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

CREATE POLICY "builder_admin_manage_workers"
ON public.workers FOR ALL TO authenticated
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
);

-- incidents - Employer-based access (CRITICAL - most sensitive data)
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_incidents" ON public.incidents;
DROP POLICY IF EXISTS "company_users_view_own_incidents" ON public.incidents;
DROP POLICY IF EXISTS "mend_staff_manage_incidents" ON public.incidents;
DROP POLICY IF EXISTS "company_users_manage_incidents" ON public.incidents;

CREATE POLICY "mend_staff_view_all_incidents"
ON public.incidents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

CREATE POLICY "company_users_view_own_incidents"
ON public.incidents FOR SELECT TO authenticated
USING (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
);

CREATE POLICY "mend_staff_manage_incidents"
ON public.incidents FOR ALL TO authenticated
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

CREATE POLICY "company_users_manage_incidents"
ON public.incidents FOR ALL TO authenticated
USING (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
)
WITH CHECK (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
);

-- claims - Employer-based access
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_claims" ON public.claims;
DROP POLICY IF EXISTS "company_users_view_own_claims" ON public.claims;
DROP POLICY IF EXISTS "mend_staff_manage_claims" ON public.claims;
DROP POLICY IF EXISTS "company_users_manage_claims" ON public.claims;

CREATE POLICY "mend_staff_view_all_claims"
ON public.claims FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

CREATE POLICY "company_users_view_own_claims"
ON public.claims FOR SELECT TO authenticated
USING (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
);

CREATE POLICY "mend_staff_manage_claims"
ON public.claims FOR ALL TO authenticated
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

CREATE POLICY "company_users_manage_claims"
ON public.claims FOR ALL TO authenticated
USING (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
)
WITH CHECK (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
);

-- hours_worked - Employer-based access
ALTER TABLE public.hours_worked ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_hours" ON public.hours_worked;
DROP POLICY IF EXISTS "company_users_view_own_hours" ON public.hours_worked;
DROP POLICY IF EXISTS "mend_staff_manage_hours" ON public.hours_worked;
DROP POLICY IF EXISTS "company_users_manage_hours" ON public.hours_worked;

CREATE POLICY "mend_staff_view_all_hours"
ON public.hours_worked FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

CREATE POLICY "company_users_view_own_hours"
ON public.hours_worked FOR SELECT TO authenticated
USING (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
);

CREATE POLICY "mend_staff_manage_hours"
ON public.hours_worked FOR ALL TO authenticated
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

CREATE POLICY "company_users_manage_hours"
ON public.hours_worked FOR ALL TO authenticated
USING (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
)
WITH CHECK (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
);

-- appointments - Employer-based access
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_appointments" ON public.appointments;
DROP POLICY IF EXISTS "company_users_view_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "mend_staff_manage_appointments" ON public.appointments;
DROP POLICY IF EXISTS "company_users_manage_appointments" ON public.appointments;

CREATE POLICY "mend_staff_view_all_appointments"
ON public.appointments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

CREATE POLICY "company_users_view_own_appointments"
ON public.appointments FOR SELECT TO authenticated
USING (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
);

CREATE POLICY "mend_staff_manage_appointments"
ON public.appointments FOR ALL TO authenticated
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

CREATE POLICY "company_users_manage_appointments"
ON public.appointments FOR ALL TO authenticated
USING (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
)
WITH CHECK (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
);

-- corrective_actions - Employer-based access
ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_corrective_actions" ON public.corrective_actions;
DROP POLICY IF EXISTS "company_users_view_own_corrective_actions" ON public.corrective_actions;
DROP POLICY IF EXISTS "mend_staff_manage_corrective_actions" ON public.corrective_actions;
DROP POLICY IF EXISTS "company_users_manage_corrective_actions" ON public.corrective_actions;

CREATE POLICY "mend_staff_view_all_corrective_actions"
ON public.corrective_actions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

CREATE POLICY "company_users_view_own_corrective_actions"
ON public.corrective_actions FOR SELECT TO authenticated
USING (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
);

CREATE POLICY "mend_staff_manage_corrective_actions"
ON public.corrective_actions FOR ALL TO authenticated
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

CREATE POLICY "company_users_manage_corrective_actions"
ON public.corrective_actions FOR ALL TO authenticated
USING (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
)
WITH CHECK (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
);

-- generated_reports - Employer-based access
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_reports" ON public.generated_reports;
DROP POLICY IF EXISTS "company_users_view_own_reports" ON public.generated_reports;
DROP POLICY IF EXISTS "mend_staff_manage_reports" ON public.generated_reports;
DROP POLICY IF EXISTS "company_users_manage_reports" ON public.generated_reports;

CREATE POLICY "mend_staff_view_all_reports"
ON public.generated_reports FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

CREATE POLICY "company_users_view_own_reports"
ON public.generated_reports FOR SELECT TO authenticated
USING (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
);

CREATE POLICY "mend_staff_manage_reports"
ON public.generated_reports FOR ALL TO authenticated
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

CREATE POLICY "company_users_manage_reports"
ON public.generated_reports FOR ALL TO authenticated
USING (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
)
WITH CHECK (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
);

-- employer_kpis - Employer-based access
ALTER TABLE public.employer_kpis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_kpis" ON public.employer_kpis;
DROP POLICY IF EXISTS "company_users_view_own_kpis" ON public.employer_kpis;
DROP POLICY IF EXISTS "mend_staff_manage_kpis" ON public.employer_kpis;
DROP POLICY IF EXISTS "company_users_manage_kpis" ON public.employer_kpis;

CREATE POLICY "mend_staff_view_all_kpis"
ON public.employer_kpis FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

CREATE POLICY "company_users_view_own_kpis"
ON public.employer_kpis FOR SELECT TO authenticated
USING (
  employer_id IN (
    SELECT u.employer_id FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id >= 4
    AND u.employer_id IS NOT NULL
  )
);

CREATE POLICY "mend_staff_manage_kpis"
ON public.employer_kpis FOR ALL TO authenticated
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

-- =====================================================
-- SECTION 3: ADMIN-ONLY TABLES
-- These tables should only be accessible by MEND staff
-- =====================================================

-- debug_auth_logs - Admin only
ALTER TABLE public.debug_auth_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_only_debug_logs" ON public.debug_auth_logs;

CREATE POLICY "mend_staff_only_debug_logs"
ON public.debug_auth_logs FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

-- email_logs - Admin only
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_only_email_logs" ON public.email_logs;

CREATE POLICY "mend_staff_only_email_logs"
ON public.email_logs FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

-- import_data - Admin only
ALTER TABLE public.import_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_only_import_data" ON public.import_data;

CREATE POLICY "mend_staff_only_import_data"
ON public.import_data FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.jwt()->>'email'
    AND u.role_id IN (1, 2, 3)
  )
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON public.employers TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.departments TO authenticated;
GRANT SELECT ON public.actions_taken TO authenticated;
GRANT SELECT ON public.agency_of_injury_codes TO authenticated;
GRANT SELECT ON public.bodily_location_codes TO authenticated;
GRANT SELECT ON public.body_parts TO authenticated;
GRANT SELECT ON public.body_parts_bodily_codes TO authenticated;
GRANT SELECT ON public.body_sides TO authenticated;
GRANT SELECT ON public.claim_types TO authenticated;
GRANT SELECT ON public.cost_assumptions TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hours_worked TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corrective_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employer_kpis TO authenticated;

GRANT ALL ON public.debug_auth_logs TO authenticated;
GRANT ALL ON public.email_logs TO authenticated;
GRANT ALL ON public.import_data TO authenticated;

