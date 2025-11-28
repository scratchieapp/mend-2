-- RPC function to create a site for builder admins
-- This bypasses direct RLS and handles auth internally
-- Accepts clerk_user_id as parameter (same pattern as admin_create_user)

CREATE OR REPLACE FUNCTION public.create_site_for_employer(
  p_clerk_user_id TEXT,
  p_site_name TEXT,
  p_employer_id INTEGER,
  p_street_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_post_code TEXT DEFAULT NULL,
  p_supervisor_name TEXT DEFAULT NULL,
  p_supervisor_telephone TEXT DEFAULT NULL,
  p_project_type TEXT DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_status TEXT DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_new_site RECORD;
BEGIN
  -- Validate clerk_user_id was provided
  IF p_clerk_user_id IS NULL OR p_clerk_user_id = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Look up the user by clerk_user_id
  SELECT u.user_id, u.email, u.role_id, u.employer_id
  INTO v_user_record
  FROM public.users u
  WHERE u.clerk_user_id = p_clerk_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in database');
  END IF;
  
  -- Check if user is authorized (Mend staff roles 1-3, or Builder Admin role 5 for their own employer)
  IF v_user_record.role_id IN (1, 2, 3) THEN
    -- Mend staff can create sites for any employer
    NULL;
  ELSIF v_user_record.role_id = 5 THEN
    -- Builder Admin can only create sites for their own employer
    IF v_user_record.employer_id IS NULL OR v_user_record.employer_id != p_employer_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'You can only create sites for your own employer');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to create sites');
  END IF;
  
  -- Create the site
  INSERT INTO public.sites (
    site_name,
    employer_id,
    street_address,
    city,
    state,
    post_code,
    supervisor_name,
    supervisor_telephone,
    project_type,
    latitude,
    longitude,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_site_name,
    p_employer_id,
    p_street_address,
    p_city,
    p_state,
    p_post_code,
    p_supervisor_name,
    p_supervisor_telephone,
    p_project_type,
    p_latitude,
    p_longitude,
    p_status,
    NOW(),
    NOW()
  )
  RETURNING * INTO v_new_site;
  
  RETURN jsonb_build_object(
    'success', true,
    'site', row_to_json(v_new_site)::jsonb
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_site_for_employer TO authenticated;

-- RPC function to update a site
CREATE OR REPLACE FUNCTION public.update_site_for_employer(
  p_clerk_user_id TEXT,
  p_site_id INTEGER,
  p_site_name TEXT DEFAULT NULL,
  p_street_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_post_code TEXT DEFAULT NULL,
  p_supervisor_name TEXT DEFAULT NULL,
  p_supervisor_telephone TEXT DEFAULT NULL,
  p_project_type TEXT DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_site_record RECORD;
  v_updated_site RECORD;
BEGIN
  -- Validate clerk_user_id was provided
  IF p_clerk_user_id IS NULL OR p_clerk_user_id = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Look up the user by clerk_user_id
  SELECT u.user_id, u.email, u.role_id, u.employer_id
  INTO v_user_record
  FROM public.users u
  WHERE u.clerk_user_id = p_clerk_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in database');
  END IF;
  
  -- Get the site
  SELECT * INTO v_site_record FROM public.sites WHERE site_id = p_site_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Site not found');
  END IF;
  
  -- Check permissions
  IF v_user_record.role_id IN (1, 2, 3) THEN
    -- Mend staff can update any site
    NULL;
  ELSIF v_user_record.role_id = 5 THEN
    -- Builder Admin can only update sites for their own employer
    IF v_user_record.employer_id IS NULL OR v_user_record.employer_id != v_site_record.employer_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'You can only update sites for your own employer');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to update sites');
  END IF;
  
  -- Update the site (only non-null values)
  UPDATE public.sites SET
    site_name = COALESCE(p_site_name, site_name),
    street_address = COALESCE(p_street_address, street_address),
    city = COALESCE(p_city, city),
    state = COALESCE(p_state, state),
    post_code = COALESCE(p_post_code, post_code),
    supervisor_name = COALESCE(p_supervisor_name, supervisor_name),
    supervisor_telephone = COALESCE(p_supervisor_telephone, supervisor_telephone),
    project_type = COALESCE(p_project_type, project_type),
    latitude = COALESCE(p_latitude, latitude),
    longitude = COALESCE(p_longitude, longitude),
    status = COALESCE(p_status, status),
    updated_at = NOW()
  WHERE site_id = p_site_id
  RETURNING * INTO v_updated_site;
  
  RETURN jsonb_build_object(
    'success', true,
    'site', row_to_json(v_updated_site)::jsonb
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_site_for_employer TO authenticated;

-- RPC function to delete a site
CREATE OR REPLACE FUNCTION public.delete_site_for_employer(
  p_clerk_user_id TEXT,
  p_site_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_site_record RECORD;
BEGIN
  -- Validate clerk_user_id was provided
  IF p_clerk_user_id IS NULL OR p_clerk_user_id = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Look up the user by clerk_user_id
  SELECT u.user_id, u.email, u.role_id, u.employer_id
  INTO v_user_record
  FROM public.users u
  WHERE u.clerk_user_id = p_clerk_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in database');
  END IF;
  
  -- Get the site
  SELECT * INTO v_site_record FROM public.sites WHERE site_id = p_site_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Site not found');
  END IF;
  
  -- Check permissions
  IF v_user_record.role_id IN (1, 2, 3) THEN
    -- Mend staff can delete any site
    NULL;
  ELSIF v_user_record.role_id = 5 THEN
    -- Builder Admin can only delete sites for their own employer
    IF v_user_record.employer_id IS NULL OR v_user_record.employer_id != v_site_record.employer_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'You can only delete sites for your own employer');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to delete sites');
  END IF;
  
  -- Delete the site
  DELETE FROM public.sites WHERE site_id = p_site_id;
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_site_for_employer TO authenticated;

