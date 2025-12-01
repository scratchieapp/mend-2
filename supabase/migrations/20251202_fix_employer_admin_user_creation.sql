-- =====================================================
-- Fix User Creation for Employer Admins
-- Date: 2025-12-02
-- Purpose: Allow employer admins (Role 5) to create users in their own company
-- =====================================================

-- Drop and recreate the function with updated permissions
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, integer, text);

CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_clerk_user_id text,
  p_email text,
  p_display_name text DEFAULT NULL,
  p_role_id integer DEFAULT NULL,
  p_employer_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_caller_role_id integer;
  v_caller_employer_id integer;
  v_caller_email text;
  v_target_employer_id integer;
  v_result json;
BEGIN
  -- Check that clerk_user_id was provided
  IF p_clerk_user_id IS NULL OR p_clerk_user_id = '' THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get caller's role and employer from their clerk_user_id
  SELECT role_id, employer_id, email INTO v_caller_role_id, v_caller_employer_id, v_caller_email
  FROM public.users
  WHERE clerk_user_id = p_clerk_user_id
  LIMIT 1;

  -- Parse target employer ID
  v_target_employer_id := CASE 
    WHEN p_employer_id IS NULL OR p_employer_id = '' OR p_employer_id = 'none' THEN NULL 
    ELSE p_employer_id::integer 
  END;

  -- Permission check:
  -- Roles 1, 2, 3 (Mend staff) can create any user
  -- Role 5 (Employer Admin) can only create users in their own company with roles 5, 6, 7
  IF v_caller_role_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  ELSIF v_caller_role_id <= 3 THEN
    -- Mend staff can create any user - permission granted
    NULL;
  ELSIF v_caller_role_id = 5 THEN
    -- Employer Admin can only create users in their own company
    IF v_caller_employer_id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Permission denied: Your account is not associated with an employer');
    END IF;
    
    -- Must create user in their own company
    IF v_target_employer_id IS NULL OR v_target_employer_id != v_caller_employer_id THEN
      RETURN json_build_object('success', false, 'error', 'Permission denied: You can only create users in your own company');
    END IF;
    
    -- Can only assign roles 5 (Employer Admin), 6 (Site Admin), or 7 (Worker)
    IF p_role_id IS NOT NULL AND p_role_id NOT IN (5, 6, 7) THEN
      RETURN json_build_object('success', false, 'error', 'Permission denied: You can only assign employer-level roles (Admin, Site Admin, or Worker)');
    END IF;
  ELSE
    -- Other roles cannot create users
    RETURN json_build_object('success', false, 'error', 'Permission denied: You do not have permission to create users');
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email) THEN
    RETURN json_build_object('success', false, 'error', 'A user with this email already exists');
  END IF;

  -- Generate a new UUID for the user
  v_user_id := gen_random_uuid();

  -- Insert the new user
  INSERT INTO public.users (
    user_id,
    email,
    display_name,
    role_id,
    employer_id,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_email,
    COALESCE(p_display_name, split_part(p_email, '@', 1)),
    p_role_id,
    v_target_employer_id,
    NOW(),
    NOW()
  );

  -- Return success with the new user_id
  SELECT json_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_email
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'A user with this email already exists');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, integer, text) TO authenticated;

COMMENT ON FUNCTION public.admin_create_user IS 'Allows Mend staff (roles 1-3) to create any user, or employer admins (role 5) to create users in their own company with roles 5-7. Uses SECURITY DEFINER to bypass RLS.';


-- Also update admin_update_user to allow employer admins to update their own users
DROP FUNCTION IF EXISTS public.admin_update_user(text, text, text, integer, text);

CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_clerk_user_id text,
  p_user_id text,
  p_display_name text DEFAULT NULL,
  p_role_id integer DEFAULT NULL,
  p_employer_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role_id integer;
  v_caller_employer_id integer;
  v_target_employer_id integer;
  v_target_user_employer_id integer;
  v_result json;
BEGIN
  -- Check that clerk_user_id was provided
  IF p_clerk_user_id IS NULL OR p_clerk_user_id = '' THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get caller's role and employer
  SELECT role_id, employer_id INTO v_caller_role_id, v_caller_employer_id
  FROM public.users
  WHERE clerk_user_id = p_clerk_user_id
  LIMIT 1;

  -- Get target user's current employer
  SELECT employer_id INTO v_target_user_employer_id
  FROM public.users
  WHERE user_id = p_user_id::uuid
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Parse target employer ID (what they want to change it to)
  v_target_employer_id := CASE 
    WHEN p_employer_id IS NULL THEN v_target_user_employer_id -- Keep current
    WHEN p_employer_id = '' OR p_employer_id = 'null' OR p_employer_id = 'none' THEN NULL 
    ELSE p_employer_id::integer 
  END;

  -- Permission check
  IF v_caller_role_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  ELSIF v_caller_role_id <= 3 THEN
    -- Mend staff can update any user
    NULL;
  ELSIF v_caller_role_id = 5 THEN
    -- Employer Admin can only update users in their own company
    IF v_caller_employer_id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Permission denied: Your account is not associated with an employer');
    END IF;
    
    -- Target user must be in their company
    IF v_target_user_employer_id IS NULL OR v_target_user_employer_id != v_caller_employer_id THEN
      RETURN json_build_object('success', false, 'error', 'Permission denied: You can only update users in your own company');
    END IF;
    
    -- Cannot change employer to a different company
    IF v_target_employer_id IS NOT NULL AND v_target_employer_id != v_caller_employer_id THEN
      RETURN json_build_object('success', false, 'error', 'Permission denied: You cannot move users to a different company');
    END IF;
    
    -- Can only assign roles 5-7
    IF p_role_id IS NOT NULL AND p_role_id NOT IN (5, 6, 7) THEN
      RETURN json_build_object('success', false, 'error', 'Permission denied: You can only assign employer-level roles');
    END IF;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Permission denied: You do not have permission to update users');
  END IF;

  -- Update the user
  UPDATE public.users
  SET
    display_name = COALESCE(p_display_name, display_name),
    role_id = COALESCE(p_role_id, role_id),
    employer_id = v_target_employer_id,
    updated_at = NOW()
  WHERE user_id = p_user_id::uuid;

  -- Return success
  RETURN json_build_object('success', true, 'user_id', p_user_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user(text, text, text, integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user(text, text, text, integer, text) TO authenticated;

COMMENT ON FUNCTION public.admin_update_user IS 'Allows Mend staff (roles 1-3) to update any user, or employer admins (role 5) to update users in their own company. Uses SECURITY DEFINER to bypass RLS.';

