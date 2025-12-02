-- RPC function to get employer statistics for Super Admin dashboard
-- Returns all employers with site count, incident count, LTI count, and last incident date

DROP FUNCTION IF EXISTS get_employer_statistics(INTEGER);

CREATE OR REPLACE FUNCTION get_employer_statistics(
  p_user_role_id INTEGER
)
RETURNS TABLE (
  employer_id INTEGER,
  employer_name TEXT,
  employer_address TEXT,
  employer_state TEXT,
  employer_post_code TEXT,
  site_count BIGINT,
  incident_count BIGINT,
  lti_count BIGINT,
  mti_count BIGINT,
  last_incident_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow Mend staff (roles 1-4) to see all employers
  IF p_user_role_id IS NULL OR p_user_role_id > 4 THEN
    RAISE EXCEPTION 'Access denied: Only Mend staff can view all employer statistics';
  END IF;

  RETURN QUERY
  SELECT 
    e.employer_id,
    e.employer_name,
    e.employer_address,
    e.employer_state,
    e.employer_post_code,
    COUNT(DISTINCT s.site_id) as site_count,
    COUNT(DISTINCT i.incident_id) as incident_count,
    COUNT(DISTINCT CASE WHEN UPPER(i.classification) IN ('LTI', 'LOST TIME INJURY') THEN i.incident_id END) as lti_count,
    COUNT(DISTINCT CASE WHEN UPPER(i.classification) IN ('MTI', 'MEDICAL TREATMENT INJURY') THEN i.incident_id END) as mti_count,
    MAX(i.created_at) as last_incident_date
  FROM employers e
  LEFT JOIN sites s ON e.employer_id = s.employer_id
  LEFT JOIN incidents i ON e.employer_id = i.employer_id AND i.deleted_at IS NULL AND i.archived_at IS NULL
  GROUP BY e.employer_id, e.employer_name, e.employer_address, e.employer_state, e.employer_post_code
  ORDER BY e.employer_name;
END;
$$;

-- Grant execute to anon role (for Clerk auth)
GRANT EXECUTE ON FUNCTION get_employer_statistics(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_employer_statistics(INTEGER) TO authenticated;

