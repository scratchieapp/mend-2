-- Fix RPC functions to have consistent return types and avoid structure mismatch errors
-- Also ensures both functions return mobile_number and clerk_user_id

DROP FUNCTION IF EXISTS public.get_user_profile_by_clerk_id(text);
DROP FUNCTION IF EXISTS public.get_user_profile_by_email(text);

-- 1. Get User Profile by Clerk ID
CREATE OR REPLACE FUNCTION public.get_user_profile_by_clerk_id(p_clerk_user_id text)
RETURNS TABLE(
  user_id uuid, 
  email text, 
  display_name text, 
  custom_display_name text, 
  role_id integer, 
  employer_id integer, 
  site_id integer, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  last_seen_at timestamp with time zone, 
  role_name text, 
  role_label text, 
  employer_name text, 
  mobile_number text,
  clerk_user_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u.user_id,
    u.email::text,
    u.display_name::text,
    u.custom_display_name::text,
    u.role_id,
    u.employer_id,
    u.site_id,
    u.created_at,
    u.updated_at,
    u.last_seen_at,
    r.role_name::text,
    r.role_label::text,
    e.employer_name::text,
    u.mobile_number::text,
    u.clerk_user_id::text
  FROM users u
  LEFT JOIN user_roles r ON u.role_id = r.role_id
  LEFT JOIN employers e ON u.employer_id = e.employer_id
  WHERE u.clerk_user_id = p_clerk_user_id;
END;
$function$;

-- 2. Get User Profile by Email
CREATE OR REPLACE FUNCTION public.get_user_profile_by_email(p_email text)
RETURNS TABLE(
  user_id uuid, 
  email text, 
  display_name text, 
  custom_display_name text, 
  role_id integer, 
  employer_id integer, 
  site_id integer, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  last_seen_at timestamp with time zone, 
  role_name text, 
  role_label text, 
  employer_name text, 
  mobile_number text,
  clerk_user_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u.user_id,
    u.email::text,
    u.display_name::text,
    u.custom_display_name::text,
    u.role_id,
    u.employer_id,
    u.site_id,
    u.created_at,
    u.updated_at,
    u.last_seen_at,
    r.role_name::text,
    r.role_label::text,
    e.employer_name::text,
    u.mobile_number::text,
    u.clerk_user_id::text
  FROM users u
  LEFT JOIN user_roles r ON u.role_id = r.role_id
  LEFT JOIN employers e ON u.employer_id = e.employer_id
  WHERE lower(u.email) = lower(p_email);
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_profile_by_clerk_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_by_clerk_id(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_profile_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_by_email(text) TO service_role;

