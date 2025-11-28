-- =====================================================
-- FIX: update_incident_rbac type mismatch
-- The time_of_injury field needs proper type handling
-- =====================================================

DROP FUNCTION IF EXISTS public.update_incident_rbac(INTEGER, INTEGER, INTEGER, JSONB);

CREATE OR REPLACE FUNCTION public.update_incident_rbac(
  p_incident_id INTEGER,
  p_user_role_id INTEGER,
  p_user_employer_id INTEGER,
  p_update_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident_employer_id INTEGER;
  v_time_of_injury TIME;
  v_date_of_injury DATE;
BEGIN
  -- Get the incident's employer_id
  SELECT employer_id INTO v_incident_employer_id
  FROM incidents
  WHERE incident_id = p_incident_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Check RBAC permissions
  IF p_user_role_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User role not provided');
  END IF;
  
  IF p_user_role_id > 3 AND (p_user_employer_id IS NULL OR p_user_employer_id != v_incident_employer_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied: Cannot update incidents from other employers');
  END IF;
  
  -- Handle time_of_injury type conversion (TIME type)
  IF p_update_data->>'time_of_injury' IS NOT NULL AND p_update_data->>'time_of_injury' != '' THEN
    v_time_of_injury := (p_update_data->>'time_of_injury')::TIME;
  ELSE
    SELECT time_of_injury INTO v_time_of_injury FROM incidents WHERE incident_id = p_incident_id;
  END IF;
  
  -- Handle date_of_injury type conversion (DATE type)
  IF p_update_data->>'date_of_injury' IS NOT NULL AND p_update_data->>'date_of_injury' != '' THEN
    v_date_of_injury := (p_update_data->>'date_of_injury')::DATE;
  ELSE
    SELECT date_of_injury INTO v_date_of_injury FROM incidents WHERE incident_id = p_incident_id;
  END IF;
  
  -- Perform the update
  UPDATE incidents
  SET
    notifying_person_name = COALESCE(NULLIF(p_update_data->>'notifying_person_name', ''), notifying_person_name),
    notifying_person_position = COALESCE(NULLIF(p_update_data->>'notifying_person_position', ''), notifying_person_position),
    notifying_person_telephone = COALESCE(NULLIF(p_update_data->>'notifying_person_telephone', ''), notifying_person_telephone),
    worker_id = COALESCE((NULLIF(p_update_data->>'worker_id', ''))::INTEGER, worker_id),
    site_id = COALESCE((NULLIF(p_update_data->>'site_id', ''))::INTEGER, site_id),
    date_of_injury = v_date_of_injury,
    time_of_injury = v_time_of_injury,
    injury_type = COALESCE(NULLIF(p_update_data->>'injury_type', ''), injury_type),
    body_part_id = COALESCE((NULLIF(p_update_data->>'body_part_id', ''))::INTEGER, body_part_id),
    injury_description = COALESCE(NULLIF(p_update_data->>'injury_description', ''), injury_description),
    witness = COALESCE(NULLIF(p_update_data->>'witness', ''), witness),
    treatment_provided = COALESCE(NULLIF(p_update_data->>'treatment_provided', ''), treatment_provided),
    referral = COALESCE(NULLIF(p_update_data->>'referral', ''), referral),
    doctor_details = COALESCE(NULLIF(p_update_data->>'doctor_details', ''), doctor_details),
    doctor_id = COALESCE((NULLIF(p_update_data->>'doctor_id', ''))::INTEGER, doctor_id),
    actions = COALESCE(NULLIF(p_update_data->>'actions', ''), actions),
    case_notes = COALESCE(NULLIF(p_update_data->>'case_notes', ''), case_notes),
    updated_at = NOW()
  WHERE incident_id = p_incident_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'incident_id', p_incident_id,
    'updated_at', NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_incident_rbac TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_incident_rbac TO anon;

-- Also create an RPC for fetching lookup data (injury types, body parts) that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_lookup_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_injury_types JSONB;
  v_body_parts JSONB;
  v_body_sides JSONB;
BEGIN
  -- Get injury types
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'type_id', id,
    'type_name', injury_type_name
  )), '[]'::jsonb)
  INTO v_injury_types
  FROM injury_type;
  
  -- Get body parts
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'body_part_id', body_part_id,
    'body_part_name', body_part_name
  )), '[]'::jsonb)
  INTO v_body_parts
  FROM body_parts;
  
  -- Get body sides
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'body_side_id', body_side_id,
    'body_side_name', body_side_name
  )), '[]'::jsonb)
  INTO v_body_sides
  FROM body_sides;
  
  RETURN jsonb_build_object(
    'injury_types', v_injury_types,
    'body_parts', v_body_parts,
    'body_sides', v_body_sides
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lookup_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lookup_data TO anon;

COMMENT ON FUNCTION public.get_lookup_data IS 'Fetches lookup data (injury types, body parts, body sides) bypassing RLS';

