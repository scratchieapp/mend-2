-- Row Level Security Policies for Mend-2 Platform
-- This migration sets up comprehensive RLS policies for company-specific data filtering

-- Enable RLS on all tables
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create a function to get current user's employer_id
CREATE OR REPLACE FUNCTION auth.employer_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT employer_id 
    FROM public.users 
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
    OR email = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get current user's role
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT ur.role_name 
    FROM public.users u
    JOIN public.user_roles ur ON u.role_id = ur.role_id
    WHERE u.clerk_user_id = auth.jwt() ->> 'sub'
    OR u.email = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user is an admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.user_role() IN ('mend_super_admin', 'builder_admin', 'administrator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT
  USING (
    clerk_user_id = auth.jwt() ->> 'sub' 
    OR email = auth.jwt() ->> 'email'
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE
  USING (
    clerk_user_id = auth.jwt() ->> 'sub' 
    OR email = auth.jwt() ->> 'email'
  );

DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT
  USING (auth.is_admin());

DROP POLICY IF EXISTS "Admins can manage all users" ON users;
CREATE POLICY "Admins can manage all users" ON users
  FOR ALL
  USING (auth.is_admin());

-- EMPLOYERS table policies
DROP POLICY IF EXISTS "Users can view their own employer" ON employers;
CREATE POLICY "Users can view their own employer" ON employers
  FOR SELECT
  USING (
    employer_id = auth.employer_id()
    OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Admins can manage employers" ON employers;
CREATE POLICY "Admins can manage employers" ON employers
  FOR ALL
  USING (auth.is_admin());

-- SITES table policies
DROP POLICY IF EXISTS "Users can view sites for their employer" ON sites;
CREATE POLICY "Users can view sites for their employer" ON sites
  FOR SELECT
  USING (
    employer_id = auth.employer_id()
    OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Site admins can manage their sites" ON sites;
CREATE POLICY "Site admins can manage their sites" ON sites
  FOR ALL
  USING (
    (employer_id = auth.employer_id() AND auth.user_role() IN ('site_admin', 'builder_senior'))
    OR auth.is_admin()
  );

-- INCIDENTS table policies
DROP POLICY IF EXISTS "Users can view incidents for their employer" ON incidents;
CREATE POLICY "Users can view incidents for their employer" ON incidents
  FOR SELECT
  USING (
    employer_id = auth.employer_id()
    OR auth.is_admin()
    OR auth.user_role() = 'medical_professional'
  );

DROP POLICY IF EXISTS "Users can create incidents for their employer" ON incidents;
CREATE POLICY "Users can create incidents for their employer" ON incidents
  FOR INSERT
  WITH CHECK (
    employer_id = auth.employer_id()
    OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Users can update incidents for their employer" ON incidents;
CREATE POLICY "Users can update incidents for their employer" ON incidents
  FOR UPDATE
  USING (
    employer_id = auth.employer_id()
    OR auth.is_admin()
    OR auth.user_role() = 'medical_professional'
  );

-- WORKERS table policies
DROP POLICY IF EXISTS "Users can view workers for their employer" ON workers;
CREATE POLICY "Users can view workers for their employer" ON workers
  FOR SELECT
  USING (
    employer_id = auth.employer_id()
    OR auth.is_admin()
  );

DROP POLICY IF EXISTS "Users can manage workers for their employer" ON workers;
CREATE POLICY "Users can manage workers for their employer" ON workers
  FOR ALL
  USING (
    employer_id = auth.employer_id()
    OR auth.is_admin()
  );

-- INCIDENT_DOCUMENTS table policies
DROP POLICY IF EXISTS "Users can view documents for their incidents" ON incident_documents;
CREATE POLICY "Users can view documents for their incidents" ON incident_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM incidents i 
      WHERE i.incident_id = incident_documents.incident_id 
      AND (i.employer_id = auth.employer_id() OR auth.is_admin())
    )
  );

DROP POLICY IF EXISTS "Users can upload documents for their incidents" ON incident_documents;
CREATE POLICY "Users can upload documents for their incidents" ON incident_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM incidents i 
      WHERE i.incident_id = incident_documents.incident_id 
      AND (i.employer_id = auth.employer_id() OR auth.is_admin())
    )
  );

-- NOTIFICATIONS table policies
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT
  USING (
    recipient_user_id = (SELECT user_id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub' OR email = auth.jwt() ->> 'email')
    OR auth.is_admin()
  );

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT
  WITH CHECK (true); -- Allow system to create notifications for any user

-- Grant necessary permissions to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON incidents, workers, incident_documents, notifications TO authenticated;
GRANT UPDATE ON users TO authenticated;

-- Grant admin permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated; -- Will be filtered by RLS

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_employer_id ON users(employer_id);
CREATE INDEX IF NOT EXISTS idx_incidents_employer_id ON incidents(employer_id);
CREATE INDEX IF NOT EXISTS idx_sites_employer_id ON sites(employer_id);
CREATE INDEX IF NOT EXISTS idx_workers_employer_id ON workers(employer_id);