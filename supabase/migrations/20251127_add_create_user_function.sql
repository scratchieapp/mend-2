-- =====================================================
-- Create User RPC Function
-- Date: 2025-11-27
-- Purpose: Allow admins to pre-register users with RLS bypass
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, integer, text);

-- Create function to insert users (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.admin_create_user(
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
  v_user_id text;
  v_caller_role_id integer;
  v_result json;
BEGIN
  -- Check that caller is authenticated
  IF auth.jwt() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get caller's role from their email
  SELECT role_id INTO v_caller_role_id
  FROM public.users
  WHERE email = auth.jwt()->>'email'
  LIMIT 1;

  -- Only roles 1, 2, 3 (Mend staff) can create users
  IF v_caller_role_id IS NULL OR v_caller_role_id > 3 THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied: Only Mend staff can create users');
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email) THEN
    RETURN json_build_object('success', false, 'error', 'A user with this email already exists');
  END IF;

  -- Generate a new UUID for the user
  v_user_id := gen_random_uuid()::text;

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
    p_employer_id,
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, integer, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.admin_create_user IS 'Allows Mend staff (roles 1-3) to pre-register users. Uses SECURITY DEFINER to bypass RLS.';

