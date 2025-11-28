-- Create an RBAC-aware RPC to add workers
-- This function allows authenticated users to add workers with proper access control

CREATE OR REPLACE FUNCTION public.add_worker_rbac(
    p_given_name TEXT,
    p_family_name TEXT,
    p_phone_number TEXT DEFAULT NULL,
    p_residential_address TEXT DEFAULT NULL,
    p_date_of_birth DATE DEFAULT NULL,
    p_gender TEXT DEFAULT NULL,
    p_employer_id INT DEFAULT NULL,
    p_user_role_id INT DEFAULT NULL,
    p_user_employer_id INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_worker_id INT;
    result JSONB;
BEGIN
    -- Validate required fields
    IF p_given_name IS NULL OR p_given_name = '' THEN
        RAISE EXCEPTION 'First name is required';
    END IF;
    
    IF p_family_name IS NULL OR p_family_name = '' THEN
        RAISE EXCEPTION 'Last name is required';
    END IF;

    -- Check access: 
    -- Mend Staff (roles 1-3) can add workers to any employer
    -- Other roles can only add workers to their own employer
    IF p_user_role_id NOT IN (1, 2, 3) THEN
        IF p_employer_id IS NULL OR p_employer_id != p_user_employer_id THEN
            RAISE EXCEPTION 'Permission denied: You can only add workers to your own organization';
        END IF;
    END IF;

    -- Insert the new worker
    INSERT INTO public.workers (
        given_name,
        family_name,
        phone_number,
        residential_address,
        date_of_birth,
        gender,
        employer_id,
        created_at
    ) VALUES (
        p_given_name,
        p_family_name,
        p_phone_number,
        p_residential_address,
        p_date_of_birth,
        p_gender,
        p_employer_id,
        NOW()
    )
    RETURNING worker_id INTO new_worker_id;

    -- Return the new worker data
    SELECT to_jsonb(w.*) INTO result
    FROM public.workers w
    WHERE w.worker_id = new_worker_id;

    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_worker_rbac(TEXT, TEXT, TEXT, TEXT, DATE, TEXT, INT, INT, INT) TO authenticated;

COMMENT ON FUNCTION public.add_worker_rbac IS 'RBAC-aware function to add workers. Mend Staff can add to any employer, others only to their own.';

