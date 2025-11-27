-- =====================================================
-- COMPREHENSIVE RLS POLICIES FOR ALL TABLES (CORRECTED)
-- Date: 2025-11-27
-- Purpose: Implement proper RLS for all tables
-- 
-- Access Levels:
-- - Roles 1-3 (MEND Staff): Can see all data
-- - Roles 4+ (Company Users): Can only see their employer's data
--
-- Tables WITH employer_id:
--   employer_kpis, employers, generated_reports, hours_worked,
--   incidents, lti_rates, mend_account_manager_employers,
--   rolling_safety_metrics, site_safety_comparison, sites,
--   user_employers, users, workers
--
-- Tables WITHOUT employer_id (linked via incident_id or reference data):
--   appointments, claims, corrective_actions, etc.
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
ON public.actions_taken FOR SELECT TO authenticated USING (true);

-- agency_of_injury_codes - Reference table
ALTER TABLE public.agency_of_injury_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to agency_of_injury_codes" ON public.agency_of_injury_codes;
CREATE POLICY "Allow read access to agency_of_injury_codes"
ON public.agency_of_injury_codes FOR SELECT TO authenticated USING (true);

-- bodily_location_codes - Reference table
ALTER TABLE public.bodily_location_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to bodily_location_codes" ON public.bodily_location_codes;
CREATE POLICY "Allow read access to bodily_location_codes"
ON public.bodily_location_codes FOR SELECT TO authenticated USING (true);

-- body_parts - Reference table
ALTER TABLE public.body_parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to body_parts" ON public.body_parts;
CREATE POLICY "Allow read access to body_parts"
ON public.body_parts FOR SELECT TO authenticated USING (true);

-- body_parts_bodily_codes - Reference table
ALTER TABLE public.body_parts_bodily_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to body_parts_bodily_codes" ON public.body_parts_bodily_codes;
CREATE POLICY "Allow read access to body_parts_bodily_codes"
ON public.body_parts_bodily_codes FOR SELECT TO authenticated USING (true);

-- body_sides - Reference table
ALTER TABLE public.body_sides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to body_sides" ON public.body_sides;
CREATE POLICY "Allow read access to body_sides"
ON public.body_sides FOR SELECT TO authenticated USING (true);

-- claim_types - Reference table
ALTER TABLE public.claim_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to claim_types" ON public.claim_types;
CREATE POLICY "Allow read access to claim_types"
ON public.claim_types FOR SELECT TO authenticated USING (true);

-- cost_assumptions - Reference table
ALTER TABLE public.cost_assumptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to cost_assumptions" ON public.cost_assumptions;
CREATE POLICY "Allow read access to cost_assumptions"
ON public.cost_assumptions FOR SELECT TO authenticated USING (true);

-- injury_type - Reference table
ALTER TABLE public.injury_type ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to injury_type" ON public.injury_type;
CREATE POLICY "Allow read access to injury_type"
ON public.injury_type FOR SELECT TO authenticated USING (true);

-- mechanism_of_injury_codes - Reference table
ALTER TABLE public.mechanism_of_injury_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to mechanism_of_injury_codes" ON public.mechanism_of_injury_codes;
CREATE POLICY "Allow read access to mechanism_of_injury_codes"
ON public.mechanism_of_injury_codes FOR SELECT TO authenticated USING (true);

-- nature_of_injury_codes - Reference table
ALTER TABLE public.nature_of_injury_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to nature_of_injury_codes" ON public.nature_of_injury_codes;
CREATE POLICY "Allow read access to nature_of_injury_codes"
ON public.nature_of_injury_codes FOR SELECT TO authenticated USING (true);

-- medical_centers - Reference table
ALTER TABLE public.medical_centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to medical_centers" ON public.medical_centers;
CREATE POLICY "Allow read access to medical_centers"
ON public.medical_centers FOR SELECT TO authenticated USING (true);

-- medical_professionals - Reference table (might need more restrictive access later)
ALTER TABLE public.medical_professionals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to medical_professionals" ON public.medical_professionals;
CREATE POLICY "Allow read access to medical_professionals"
ON public.medical_professionals FOR SELECT TO authenticated USING (true);

-- treatments - Reference table
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to treatments" ON public.treatments;
CREATE POLICY "Allow read access to treatments"
ON public.treatments FOR SELECT TO authenticated USING (true);

-- ui_regions - Reference table
ALTER TABLE public.ui_regions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to ui_regions" ON public.ui_regions;
CREATE POLICY "Allow read access to ui_regions"
ON public.ui_regions FOR SELECT TO authenticated USING (true);

-- report_templates - Reference table
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to report_templates" ON public.report_templates;
CREATE POLICY "Allow read access to report_templates"
ON public.report_templates FOR SELECT TO authenticated USING (true);

-- lti_rates_mend - Industry benchmark data (read-only for all)
ALTER TABLE public.lti_rates_mend ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to lti_rates_mend" ON public.lti_rates_mend;
CREATE POLICY "Allow read access to lti_rates_mend"
ON public.lti_rates_mend FOR SELECT TO authenticated USING (true);

-- =====================================================
-- SECTION 2: DATA TABLES WITH EMPLOYER_ID
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

CREATE POLICY "mend_staff_view_all_sites"
ON public.sites FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3))
);

CREATE POLICY "company_users_view_own_sites"
ON public.sites FOR SELECT TO authenticated
USING (
  employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL)
);

CREATE POLICY "mend_staff_manage_sites"
ON public.sites FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)))
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "builder_admin_manage_sites"
ON public.sites FOR ALL TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id = 5 AND u.employer_id IS NOT NULL))
WITH CHECK (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id = 5 AND u.employer_id IS NOT NULL));

-- workers - Employer-based access
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_workers" ON public.workers;
DROP POLICY IF EXISTS "company_users_view_own_workers" ON public.workers;
DROP POLICY IF EXISTS "mend_staff_manage_workers" ON public.workers;
DROP POLICY IF EXISTS "builder_admin_manage_workers" ON public.workers;

CREATE POLICY "mend_staff_view_all_workers"
ON public.workers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_view_own_workers"
ON public.workers FOR SELECT TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL));

CREATE POLICY "mend_staff_manage_workers"
ON public.workers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)))
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "builder_admin_manage_workers"
ON public.workers FOR ALL TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id = 5 AND u.employer_id IS NOT NULL))
WITH CHECK (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id = 5 AND u.employer_id IS NOT NULL));

-- incidents - Employer-based access (CRITICAL)
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_incidents" ON public.incidents;
DROP POLICY IF EXISTS "company_users_view_own_incidents" ON public.incidents;
DROP POLICY IF EXISTS "mend_staff_manage_incidents" ON public.incidents;
DROP POLICY IF EXISTS "company_users_manage_incidents" ON public.incidents;

CREATE POLICY "mend_staff_view_all_incidents"
ON public.incidents FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_view_own_incidents"
ON public.incidents FOR SELECT TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL));

CREATE POLICY "mend_staff_manage_incidents"
ON public.incidents FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)))
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_manage_incidents"
ON public.incidents FOR ALL TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL))
WITH CHECK (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL));

-- hours_worked - Employer-based access
ALTER TABLE public.hours_worked ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_hours" ON public.hours_worked;
DROP POLICY IF EXISTS "company_users_view_own_hours" ON public.hours_worked;
DROP POLICY IF EXISTS "mend_staff_manage_hours" ON public.hours_worked;
DROP POLICY IF EXISTS "company_users_manage_hours" ON public.hours_worked;

CREATE POLICY "mend_staff_view_all_hours"
ON public.hours_worked FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_view_own_hours"
ON public.hours_worked FOR SELECT TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL));

CREATE POLICY "mend_staff_manage_hours"
ON public.hours_worked FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)))
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_manage_hours"
ON public.hours_worked FOR ALL TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL))
WITH CHECK (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL));

-- generated_reports - Employer-based access
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_reports" ON public.generated_reports;
DROP POLICY IF EXISTS "company_users_view_own_reports" ON public.generated_reports;
DROP POLICY IF EXISTS "mend_staff_manage_reports" ON public.generated_reports;
DROP POLICY IF EXISTS "company_users_manage_reports" ON public.generated_reports;

CREATE POLICY "mend_staff_view_all_reports"
ON public.generated_reports FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_view_own_reports"
ON public.generated_reports FOR SELECT TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL));

CREATE POLICY "mend_staff_manage_reports"
ON public.generated_reports FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)))
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_manage_reports"
ON public.generated_reports FOR ALL TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL))
WITH CHECK (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL));

-- employer_kpis - Employer-based access
ALTER TABLE public.employer_kpis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_kpis" ON public.employer_kpis;
DROP POLICY IF EXISTS "company_users_view_own_kpis" ON public.employer_kpis;
DROP POLICY IF EXISTS "mend_staff_manage_kpis" ON public.employer_kpis;

CREATE POLICY "mend_staff_view_all_kpis"
ON public.employer_kpis FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_view_own_kpis"
ON public.employer_kpis FOR SELECT TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL));

CREATE POLICY "mend_staff_manage_kpis"
ON public.employer_kpis FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)))
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

-- lti_rates - Employer-based access
ALTER TABLE public.lti_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_lti_rates" ON public.lti_rates;
DROP POLICY IF EXISTS "company_users_view_own_lti_rates" ON public.lti_rates;
DROP POLICY IF EXISTS "mend_staff_manage_lti_rates" ON public.lti_rates;

CREATE POLICY "mend_staff_view_all_lti_rates"
ON public.lti_rates FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_view_own_lti_rates"
ON public.lti_rates FOR SELECT TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL));

CREATE POLICY "mend_staff_manage_lti_rates"
ON public.lti_rates FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)))
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

-- rolling_safety_metrics - Employer-based access
ALTER TABLE public.rolling_safety_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_safety_metrics" ON public.rolling_safety_metrics;
DROP POLICY IF EXISTS "company_users_view_own_safety_metrics" ON public.rolling_safety_metrics;

CREATE POLICY "mend_staff_view_all_safety_metrics"
ON public.rolling_safety_metrics FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_view_own_safety_metrics"
ON public.rolling_safety_metrics FOR SELECT TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL));

-- site_safety_comparison - Employer-based access
ALTER TABLE public.site_safety_comparison ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_site_safety" ON public.site_safety_comparison;
DROP POLICY IF EXISTS "company_users_view_own_site_safety" ON public.site_safety_comparison;

CREATE POLICY "mend_staff_view_all_site_safety"
ON public.site_safety_comparison FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_view_own_site_safety"
ON public.site_safety_comparison FOR SELECT TO authenticated
USING (employer_id IN (SELECT u.employer_id FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL));

-- =====================================================
-- SECTION 3: INCIDENT-LINKED TABLES (via incident_id)
-- These tables link to incidents and inherit access through joins
-- We'll allow access based on the incident's employer
-- =====================================================

-- claims - Link via incident_id
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_claims" ON public.claims;
DROP POLICY IF EXISTS "company_users_view_own_claims" ON public.claims;
DROP POLICY IF EXISTS "authenticated_manage_claims" ON public.claims;

CREATE POLICY "mend_staff_view_all_claims"
ON public.claims FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_view_own_claims"
ON public.claims FOR SELECT TO authenticated
USING (
  incident_id IN (
    SELECT i.incident_id FROM public.incidents i
    WHERE i.employer_id IN (
      SELECT u.employer_id FROM public.users u 
      WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL
    )
  )
);

CREATE POLICY "authenticated_manage_claims"
ON public.claims FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- corrective_actions - Link via incident_id
ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_corrective_actions" ON public.corrective_actions;
DROP POLICY IF EXISTS "company_users_view_own_corrective_actions" ON public.corrective_actions;
DROP POLICY IF EXISTS "authenticated_manage_corrective_actions" ON public.corrective_actions;

CREATE POLICY "mend_staff_view_all_corrective_actions"
ON public.corrective_actions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_view_own_corrective_actions"
ON public.corrective_actions FOR SELECT TO authenticated
USING (
  incident_id IN (
    SELECT i.incident_id FROM public.incidents i
    WHERE i.employer_id IN (
      SELECT u.employer_id FROM public.users u 
      WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL
    )
  )
);

CREATE POLICY "authenticated_manage_corrective_actions"
ON public.corrective_actions FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- appointments - Link via incident_id
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_appointments" ON public.appointments;
DROP POLICY IF EXISTS "company_users_view_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "authenticated_manage_appointments" ON public.appointments;

CREATE POLICY "mend_staff_view_all_appointments"
ON public.appointments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_view_own_appointments"
ON public.appointments FOR SELECT TO authenticated
USING (
  incident_id IN (
    SELECT i.incident_id FROM public.incidents i
    WHERE i.employer_id IN (
      SELECT u.employer_id FROM public.users u 
      WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL
    )
  )
);

CREATE POLICY "authenticated_manage_appointments"
ON public.appointments FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- incident_documents - Link via incident_id
ALTER TABLE public.incident_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_incident_documents" ON public.incident_documents;
DROP POLICY IF EXISTS "company_users_view_own_incident_documents" ON public.incident_documents;
DROP POLICY IF EXISTS "authenticated_manage_incident_documents" ON public.incident_documents;

CREATE POLICY "mend_staff_view_all_incident_documents"
ON public.incident_documents FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_view_own_incident_documents"
ON public.incident_documents FOR SELECT TO authenticated
USING (
  incident_id IN (
    SELECT i.incident_id FROM public.incidents i
    WHERE i.employer_id IN (
      SELECT u.employer_id FROM public.users u 
      WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL
    )
  )
);

CREATE POLICY "authenticated_manage_incident_documents"
ON public.incident_documents FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- incident_activity_log - Link via incident_id
ALTER TABLE public.incident_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_incident_activity" ON public.incident_activity_log;
DROP POLICY IF EXISTS "company_users_view_own_incident_activity" ON public.incident_activity_log;
DROP POLICY IF EXISTS "authenticated_manage_incident_activity" ON public.incident_activity_log;

CREATE POLICY "mend_staff_view_all_incident_activity"
ON public.incident_activity_log FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_view_own_incident_activity"
ON public.incident_activity_log FOR SELECT TO authenticated
USING (
  incident_id IN (
    SELECT i.incident_id FROM public.incidents i
    WHERE i.employer_id IN (
      SELECT u.employer_id FROM public.users u 
      WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL
    )
  )
);

CREATE POLICY "authenticated_manage_incident_activity"
ON public.incident_activity_log FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- incident_body_selections - Link via incident_id
ALTER TABLE public.incident_body_selections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_body_selections" ON public.incident_body_selections;
DROP POLICY IF EXISTS "company_users_view_own_body_selections" ON public.incident_body_selections;
DROP POLICY IF EXISTS "authenticated_manage_body_selections" ON public.incident_body_selections;

CREATE POLICY "mend_staff_view_all_body_selections"
ON public.incident_body_selections FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_view_own_body_selections"
ON public.incident_body_selections FOR SELECT TO authenticated
USING (
  incident_id IN (
    SELECT i.incident_id FROM public.incidents i
    WHERE i.employer_id IN (
      SELECT u.employer_id FROM public.users u 
      WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL
    )
  )
);

CREATE POLICY "authenticated_manage_body_selections"
ON public.incident_body_selections FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- incident_status_history - Link via incident_id
ALTER TABLE public.incident_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_status_history" ON public.incident_status_history;
DROP POLICY IF EXISTS "company_users_view_own_status_history" ON public.incident_status_history;
DROP POLICY IF EXISTS "authenticated_manage_status_history" ON public.incident_status_history;

CREATE POLICY "mend_staff_view_all_status_history"
ON public.incident_status_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_view_own_status_history"
ON public.incident_status_history FOR SELECT TO authenticated
USING (
  incident_id IN (
    SELECT i.incident_id FROM public.incidents i
    WHERE i.employer_id IN (
      SELECT u.employer_id FROM public.users u 
      WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL
    )
  )
);

CREATE POLICY "authenticated_manage_status_history"
ON public.incident_status_history FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- site_status_history - Link via site_id (which links to employer)
ALTER TABLE public.site_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to site_status_history" ON public.site_status_history;
DROP POLICY IF EXISTS "mend_staff_view_all_site_status_history" ON public.site_status_history;
DROP POLICY IF EXISTS "company_users_view_own_site_status_history" ON public.site_status_history;

CREATE POLICY "mend_staff_view_all_site_status_history"
ON public.site_status_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "company_users_view_own_site_status_history"
ON public.site_status_history FOR SELECT TO authenticated
USING (
  site_id IN (
    SELECT s.site_id FROM public.sites s
    WHERE s.employer_id IN (
      SELECT u.employer_id FROM public.users u 
      WHERE u.email = auth.jwt()->>'email' AND u.role_id >= 4 AND u.employer_id IS NOT NULL
    )
  )
);

-- =====================================================
-- SECTION 4: ADMIN-ONLY TABLES
-- These tables should only be accessible by MEND staff
-- =====================================================

-- debug_auth_logs - Admin only
ALTER TABLE public.debug_auth_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_only_debug_logs" ON public.debug_auth_logs;
CREATE POLICY "mend_staff_only_debug_logs"
ON public.debug_auth_logs FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

-- email_logs - Admin only
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_only_email_logs" ON public.email_logs;
CREATE POLICY "mend_staff_only_email_logs"
ON public.email_logs FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

-- import_data - Admin only
ALTER TABLE public.import_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_only_import_data" ON public.import_data;
CREATE POLICY "mend_staff_only_import_data"
ON public.import_data FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

-- imports - Admin only
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_only_imports" ON public.imports;
CREATE POLICY "mend_staff_only_imports"
ON public.imports FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

-- notifications - User can see their own
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_view_own_notifications" ON public.notifications;
CREATE POLICY "users_view_own_notifications"
ON public.notifications FOR ALL TO authenticated
USING (true);

-- reports - Admin only  
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_only_reports" ON public.reports;
CREATE POLICY "mend_staff_only_reports"
ON public.reports FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

-- user_session_contexts - Users can manage their own
ALTER TABLE public.user_session_contexts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_manage_own_context" ON public.user_session_contexts;
CREATE POLICY "users_manage_own_context"
ON public.user_session_contexts FOR ALL TO authenticated
USING (user_id = auth.jwt()->>'email' OR user_id = (auth.jwt()->>'sub'));

-- user_employers - Link table
ALTER TABLE public.user_employers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_view_all_user_employers" ON public.user_employers;
DROP POLICY IF EXISTS "users_view_own_user_employers" ON public.user_employers;

CREATE POLICY "mend_staff_view_all_user_employers"
ON public.user_employers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

CREATE POLICY "users_view_own_user_employers"
ON public.user_employers FOR SELECT TO authenticated
USING (user_id IN (SELECT user_id FROM public.users u WHERE u.email = auth.jwt()->>'email'));

-- mend_account_manager_employers - Admin only
ALTER TABLE public.mend_account_manager_employers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_only_am_employers" ON public.mend_account_manager_employers;
CREATE POLICY "mend_staff_only_am_employers"
ON public.mend_account_manager_employers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

-- voice_logs - Admin only
ALTER TABLE public.voice_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_only_voice_logs" ON public.voice_logs;
CREATE POLICY "mend_staff_only_voice_logs"
ON public.voice_logs FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

-- voice_tasks - Admin only
ALTER TABLE public.voice_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mend_staff_only_voice_tasks" ON public.voice_tasks;
CREATE POLICY "mend_staff_only_voice_tasks"
ON public.voice_tasks FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.email = auth.jwt()->>'email' AND u.role_id IN (1, 2, 3)));

-- =====================================================
-- SECTION 5: SUMMARY/VIEW TABLES (Materialized or regular)
-- These are typically read-only aggregated data
-- =====================================================

-- incident_cost_analysis
ALTER TABLE public.incident_cost_analysis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read_incident_cost_analysis" ON public.incident_cost_analysis;
CREATE POLICY "authenticated_read_incident_cost_analysis"
ON public.incident_cost_analysis FOR SELECT TO authenticated USING (true);

-- incident_cost_calculations
ALTER TABLE public.incident_cost_calculations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read_incident_cost_calculations" ON public.incident_cost_calculations;
CREATE POLICY "authenticated_read_incident_cost_calculations"
ON public.incident_cost_calculations FOR SELECT TO authenticated USING (true);

-- incident_types_summary
ALTER TABLE public.incident_types_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read_incident_types_summary" ON public.incident_types_summary;
CREATE POLICY "authenticated_read_incident_types_summary"
ON public.incident_types_summary FOR SELECT TO authenticated USING (true);

-- severity_metrics
ALTER TABLE public.severity_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read_severity_metrics" ON public.severity_metrics;
CREATE POLICY "authenticated_read_severity_metrics"
ON public.severity_metrics FOR SELECT TO authenticated USING (true);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sites TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.workers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hours_worked TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.corrective_actions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.generated_reports TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.employer_kpis TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.incident_documents TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.incident_activity_log TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.incident_body_selections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.incident_status_history TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_status_history TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_session_contexts TO authenticated;

