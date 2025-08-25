-- Enhanced Row Level Security with Company Context System
-- This migration implements proper company-based filtering with session context

-- Create a table to store user session contexts
CREATE TABLE IF NOT EXISTS user_session_contexts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  selected_employer_id INTEGER,
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_session_contexts_user_id ON user_session_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_session_contexts_expires_at ON user_session_contexts(expires_at);

-- Enable RLS on the context table
ALTER TABLE user_session_contexts ENABLE ROW LEVEL SECURITY;

-- Policy for user session contexts
DROP POLICY IF EXISTS "Users can manage their own session context" ON user_session_contexts;
CREATE POLICY "Users can manage their own session context" ON user_session_contexts
  FOR ALL
  USING (
    user_id = COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'email')
  );

-- Function to set employer context for a user
CREATE OR REPLACE FUNCTION set_employer_context(employer_id INTEGER)
RETURNS VOID AS $$
DECLARE
  v_user_id TEXT;
  v_user_role_id INTEGER;
  v_user_employer_id INTEGER;
BEGIN
  -- Get the current user ID
  v_user_id := COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'email');
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get user's role and employer
  SELECT u.role_id, u.employer_id::INTEGER
  INTO v_user_role_id, v_user_employer_id
  FROM users u
  WHERE u.clerk_user_id = v_user_id OR u.email = v_user_id;
  
  -- Check permissions
  -- Super Admin (role_id = 1) can select any employer
  -- Other users can only select their own employer
  IF v_user_role_id != 1 AND employer_id != v_user_employer_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only view data for your own company';
  END IF;
  
  -- Delete expired contexts for cleanup
  DELETE FROM user_session_contexts 
  WHERE expires_at < NOW();
  
  -- Upsert the session context
  INSERT INTO user_session_contexts (user_id, selected_employer_id, selected_at, expires_at)
  VALUES (v_user_id, employer_id, NOW(), NOW() + INTERVAL '24 hours')
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    selected_employer_id = EXCLUDED.selected_employer_id,
    selected_at = NOW(),
    expires_at = NOW() + INTERVAL '24 hours',
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get the current employer context
CREATE OR REPLACE FUNCTION get_employer_context()
RETURNS INTEGER AS $$
DECLARE
  v_user_id TEXT;
  v_selected_employer_id INTEGER;
  v_user_role_id INTEGER;
  v_user_employer_id INTEGER;
BEGIN
  -- Get the current user ID
  v_user_id := COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'email');
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get the selected employer from session context
  SELECT selected_employer_id 
  INTO v_selected_employer_id
  FROM user_session_contexts
  WHERE user_id = v_user_id 
    AND expires_at > NOW()
  ORDER BY selected_at DESC
  LIMIT 1;
  
  -- If no context is set, return the user's default employer
  IF v_selected_employer_id IS NULL THEN
    SELECT employer_id::INTEGER
    INTO v_user_employer_id
    FROM users
    WHERE clerk_user_id = v_user_id OR email = v_user_id;
    
    RETURN v_user_employer_id;
  END IF;
  
  -- Verify the user still has permission for the selected employer
  SELECT u.role_id, u.employer_id::INTEGER
  INTO v_user_role_id, v_user_employer_id
  FROM users u
  WHERE u.clerk_user_id = v_user_id OR u.email = v_user_id;
  
  -- Super Admin can view any employer
  IF v_user_role_id = 1 THEN
    RETURN v_selected_employer_id;
  END IF;
  
  -- Other users can only view their own employer
  IF v_selected_employer_id = v_user_employer_id THEN
    RETURN v_selected_employer_id;
  END IF;
  
  -- If permission check fails, return user's own employer
  RETURN v_user_employer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to clear employer context (useful for logout)
CREATE OR REPLACE FUNCTION clear_employer_context()
RETURNS VOID AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  v_user_id := COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'email');
  
  IF v_user_id IS NOT NULL THEN
    DELETE FROM user_session_contexts WHERE user_id = v_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the auth.employer_id() function to use context
CREATE OR REPLACE FUNCTION auth.employer_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN get_employer_context();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is viewing their own company
CREATE OR REPLACE FUNCTION auth.is_viewing_own_company()
RETURNS BOOLEAN AS $$
DECLARE
  v_context_employer_id INTEGER;
  v_user_employer_id INTEGER;
  v_user_id TEXT;
BEGIN
  v_user_id := COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'email');
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  v_context_employer_id := get_employer_context();
  
  SELECT employer_id::INTEGER
  INTO v_user_employer_id
  FROM users
  WHERE clerk_user_id = v_user_id OR email = v_user_id;
  
  RETURN v_context_employer_id = v_user_employer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enhanced RLS Policies using the context system

-- Drop existing policies to recreate with context awareness
DROP POLICY IF EXISTS "Users can view incidents for their employer" ON incidents;
DROP POLICY IF EXISTS "Users can view sites for their employer" ON sites;
DROP POLICY IF EXISTS "Users can view workers for their employer" ON workers;

-- INCIDENTS table policies with context
CREATE POLICY "Users can view incidents with context" ON incidents
  FOR SELECT
  USING (
    CASE 
      -- Super Admin can see all or filtered by context
      WHEN auth.user_role() = 'mend_super_admin' THEN 
        (get_employer_context() IS NULL OR employer_id = get_employer_context())
      -- Medical professionals can see all incidents
      WHEN auth.user_role() = 'medical_professional' THEN TRUE
      -- Other users see only their context employer
      ELSE employer_id = get_employer_context()
    END
  );

CREATE POLICY "Users can create incidents for context employer" ON incidents
  FOR INSERT
  WITH CHECK (
    employer_id = get_employer_context()
    OR auth.user_role() = 'mend_super_admin'
  );

CREATE POLICY "Users can update incidents for context employer" ON incidents
  FOR UPDATE
  USING (
    employer_id = get_employer_context()
    OR auth.user_role() IN ('mend_super_admin', 'medical_professional')
  );

-- SITES table policies with context
CREATE POLICY "Users can view sites with context" ON sites
  FOR SELECT
  USING (
    CASE 
      -- Super Admin can see all or filtered by context
      WHEN auth.user_role() = 'mend_super_admin' THEN 
        (get_employer_context() IS NULL OR employer_id = get_employer_context())
      -- Other users see only their context employer
      ELSE employer_id = get_employer_context()
    END
  );

-- WORKERS table policies with context
CREATE POLICY "Users can view workers with context" ON workers
  FOR SELECT
  USING (
    CASE 
      -- Super Admin can see all or filtered by context
      WHEN auth.user_role() = 'mend_super_admin' THEN 
        (get_employer_context() IS NULL OR employer_id = get_employer_context())
      -- Other users see only their context employer
      ELSE employer_id = get_employer_context()
    END
  );

-- Function to get statistics for the current employer context
CREATE OR REPLACE FUNCTION get_employer_statistics()
RETURNS TABLE (
  incident_count BIGINT,
  worker_count BIGINT,
  site_count BIGINT,
  active_lti_count BIGINT,
  selected_employer_id INTEGER,
  selected_employer_name TEXT
) AS $$
DECLARE
  v_employer_id INTEGER;
BEGIN
  v_employer_id := get_employer_context();
  
  IF v_employer_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM incidents WHERE employer_id = v_employer_id),
    (SELECT COUNT(*) FROM workers WHERE employer_id = v_employer_id),
    (SELECT COUNT(*) FROM sites WHERE employer_id = v_employer_id),
    (SELECT COUNT(*) FROM incidents WHERE employer_id = v_employer_id AND injury_type = 'LTI' AND incident_status != 'Closed'),
    v_employer_id,
    (SELECT employer_name FROM employers WHERE employer_id = v_employer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a view for easy access to employer-filtered data
CREATE OR REPLACE VIEW v_context_incidents AS
SELECT * FROM incidents 
WHERE employer_id = get_employer_context();

CREATE OR REPLACE VIEW v_context_workers AS
SELECT * FROM workers 
WHERE employer_id = get_employer_context();

CREATE OR REPLACE VIEW v_context_sites AS
SELECT * FROM sites 
WHERE employer_id = get_employer_context();

-- Grant permissions on new objects
GRANT ALL ON user_session_contexts TO authenticated;
GRANT EXECUTE ON FUNCTION set_employer_context(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_employer_context() TO authenticated;
GRANT EXECUTE ON FUNCTION clear_employer_context() TO authenticated;
GRANT EXECUTE ON FUNCTION get_employer_statistics() TO authenticated;
GRANT SELECT ON v_context_incidents TO authenticated;
GRANT SELECT ON v_context_workers TO authenticated;
GRANT SELECT ON v_context_sites TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION set_employer_context(INTEGER) IS 'Sets the employer context for the current user session. Super Admins can select any employer, others only their own.';
COMMENT ON FUNCTION get_employer_context() IS 'Gets the current employer context for filtering data. Returns user default employer if no context is set.';
COMMENT ON FUNCTION clear_employer_context() IS 'Clears the employer context for the current user session.';
COMMENT ON TABLE user_session_contexts IS 'Stores selected employer context for user sessions to enable proper data filtering';