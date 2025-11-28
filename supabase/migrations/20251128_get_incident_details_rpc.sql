-- Create an RBAC-aware RPC to get full incident details for editing
-- This function returns ALL incident fields needed for the edit page

CREATE OR REPLACE FUNCTION public.get_incident_details(
    p_incident_id INT,
    p_user_role_id INT,
    p_user_employer_id INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    incident_employer_id INT;
BEGIN
    -- First check if user has access to this incident
    SELECT employer_id INTO incident_employer_id
    FROM public.incidents
    WHERE incident_id = p_incident_id;

    IF incident_employer_id IS NULL THEN
        -- Incident not found
        RETURN NULL;
    END IF;

    -- Check access: Mend Staff (roles 1-3) can access any incident
    -- Other roles can only access incidents from their employer
    IF p_user_role_id NOT IN (1, 2, 3) AND incident_employer_id != p_user_employer_id THEN
        -- Access denied
        RETURN NULL;
    END IF;

    -- Return full incident details
    SELECT to_jsonb(inc.*) INTO result
    FROM public.incidents inc
    WHERE inc.incident_id = p_incident_id;

    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_incident_details(INT, INT, INT) TO authenticated;

COMMENT ON FUNCTION public.get_incident_details IS 'RBAC-aware function to get full incident details for editing. Returns all incident fields including notifying person details.';

