-- Diagnostic function to debug RLS and Permissions
CREATE OR REPLACE FUNCTION public.diagnose_current_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_jwt jsonb;
  v_email text;
  v_role_id int;
  v_user_exists boolean;
  v_can_read_medical_centers boolean;
  v_can_insert_medical_centers boolean;
  v_medical_centers_policy_check boolean;
  v_users_count int;
BEGIN
  v_jwt := auth.jwt();
  v_email := v_jwt ->> 'email';
  
  -- Check if we can find the user in the users table
  SELECT role_id INTO v_role_id
  FROM public.users
  WHERE lower(email) = lower(v_email);
  
  v_user_exists := (v_role_id IS NOT NULL);
  
  -- Check simple count
  SELECT count(*) INTO v_users_count FROM public.users;

  -- Check policy logic manually
  v_medical_centers_policy_check := EXISTS (
    SELECT 1 FROM public.users u
    WHERE lower(u.email) = lower(v_email)
    AND u.role_id IN (1, 2, 3, 4, 5, 6)
  );

  RETURN jsonb_build_object(
    'jwt', v_jwt,
    'email_from_jwt', v_email,
    'user_role_id_found', v_role_id,
    'user_exists_in_db', v_user_exists,
    'policy_logic_check', v_medical_centers_policy_check,
    'total_users_visible', v_users_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.diagnose_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.diagnose_current_user() TO service_role;

