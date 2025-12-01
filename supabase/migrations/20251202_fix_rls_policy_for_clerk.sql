-- Add a fallback RLS policy that trusts PostgREST's internal role validation
-- If the request is made with a valid token (which is verified by the secret),
-- and the 'sub' claim is not a UUID, we should fallback to checking if
-- the clerk_user_id in the database matches the 'sub' claim in the token.

CREATE OR REPLACE FUNCTION public.check_clerk_auth()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if the token has a 'sub' claim that matches a user's clerk_user_id
  RETURN EXISTS (
    SELECT 1
    FROM users u
    WHERE u.clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    AND u.role_id IN (1, 2, 3, 4, 5, 6)
  );
END;
$$;

-- Drop unified policy to replace it with a simpler one that uses the helper
DROP POLICY IF EXISTS "staff_manage_medical_centers" ON "public"."medical_centers";

CREATE POLICY "staff_manage_medical_centers"
ON "public"."medical_centers"
FOR ALL
TO authenticated
USING (
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM users u WHERE u.user_id = auth.uid() AND u.role_id IN (1, 2, 3, 4, 5, 6)
  ))
  OR
  public.check_clerk_auth()
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM users u WHERE u.user_id = auth.uid() AND u.role_id IN (1, 2, 3, 4, 5, 6)
  ))
  OR
  public.check_clerk_auth()
);

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.check_clerk_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_clerk_auth() TO service_role;

