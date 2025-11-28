-- =====================================================
-- RPC FUNCTION: update_incident_rbac
-- Purpose: Update incident with RBAC security
-- Date: 2025-11-28
-- =====================================================

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
  v_result JSONB;
BEGIN
  -- Get the incident's employer_id
  SELECT employer_id INTO v_incident_employer_id
  FROM incidents
  WHERE incident_id = p_incident_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Check RBAC permissions
  -- Roles 1-3 (Mend Staff) can update any incident
  -- Roles 4+ can only update incidents from their employer
  IF p_user_role_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User role not provided');
  END IF;
  
  IF p_user_role_id > 3 AND (p_user_employer_id IS NULL OR p_user_employer_id != v_incident_employer_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied: Cannot update incidents from other employers');
  END IF;
  
  -- Perform the update
  UPDATE incidents
  SET
    notifying_person_name = COALESCE(p_update_data->>'notifying_person_name', notifying_person_name),
    notifying_person_position = COALESCE(p_update_data->>'notifying_person_position', notifying_person_position),
    notifying_person_telephone = COALESCE(p_update_data->>'notifying_person_telephone', notifying_person_telephone),
    worker_id = COALESCE((p_update_data->>'worker_id')::INTEGER, worker_id),
    site_id = COALESCE((p_update_data->>'site_id')::INTEGER, site_id),
    date_of_injury = COALESCE(p_update_data->>'date_of_injury', date_of_injury::TEXT)::DATE,
    time_of_injury = COALESCE(p_update_data->>'time_of_injury', time_of_injury),
    injury_type = COALESCE(p_update_data->>'injury_type', injury_type),
    body_part_id = COALESCE((p_update_data->>'body_part_id')::INTEGER, body_part_id),
    injury_description = COALESCE(p_update_data->>'injury_description', injury_description),
    witness = COALESCE(p_update_data->>'witness', witness),
    treatment_provided = COALESCE(p_update_data->>'treatment_provided', treatment_provided),
    referral = COALESCE(p_update_data->>'referral', referral),
    doctor_details = COALESCE(p_update_data->>'doctor_details', doctor_details),
    doctor_id = COALESCE((p_update_data->>'doctor_id')::INTEGER, doctor_id),
    actions = COALESCE(p_update_data->>'actions', actions),
    case_notes = COALESCE(p_update_data->>'case_notes', case_notes),
    updated_at = NOW()
  WHERE incident_id = p_incident_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'incident_id', p_incident_id,
    'updated_at', NOW()
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_incident_rbac TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_incident_rbac TO anon;

COMMENT ON FUNCTION public.update_incident_rbac IS 'RBAC-aware incident update function that bypasses RLS while enforcing role-based access control';

