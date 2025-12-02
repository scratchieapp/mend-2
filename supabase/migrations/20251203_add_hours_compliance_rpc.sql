-- Create RPC to get hours compliance status across all employers
-- Returns which employers/sites are missing hours for the last N months

CREATE OR REPLACE FUNCTION get_hours_compliance(
  p_user_role_id INTEGER,
  p_months_back INTEGER DEFAULT 3
)
RETURNS TABLE (
  employer_id INTEGER,
  employer_name TEXT,
  total_sites BIGINT,
  sites_with_hours BIGINT,
  sites_missing_hours BIGINT,
  completion_percentage NUMERIC,
  months_checked INTEGER,
  missing_site_months BIGINT,
  total_site_months BIGINT,
  last_hours_entry TIMESTAMPTZ,
  contact_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_start DATE;
  v_month_end DATE;
BEGIN
  -- Only allow Mend staff (roles 1-4) to see all employer compliance
  IF p_user_role_id IS NULL OR p_user_role_id > 4 THEN
    RAISE EXCEPTION 'Access denied: Only Mend staff can view hours compliance';
  END IF;

  -- Calculate the date range (last N completed months, excluding current)
  -- e.g., if today is Dec 2, and months_back=3, check Sep, Oct, Nov
  v_month_end := DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day'; -- Last day of previous month
  v_month_start := DATE_TRUNC('month', v_month_end - (p_months_back - 1) * INTERVAL '1 month'); -- First day of oldest month

  RETURN QUERY
  WITH active_sites AS (
    -- Get all active sites per employer
    SELECT 
      s.employer_id,
      s.site_id
    FROM sites s
    WHERE s.deleted_at IS NULL
  ),
  month_series AS (
    -- Generate the list of months to check
    SELECT generate_series(
      v_month_start,
      DATE_TRUNC('month', v_month_end),
      '1 month'::interval
    )::date AS check_month
  ),
  expected_entries AS (
    -- Cross join to get all expected site-month combinations
    SELECT 
      s.employer_id,
      s.site_id,
      m.check_month
    FROM active_sites s
    CROSS JOIN month_series m
  ),
  actual_hours AS (
    -- Get hours that have been entered (with actual values > 0)
    SELECT 
      h.employer_id,
      h.site_id,
      DATE_TRUNC('month', h.month)::date AS hours_month
    FROM hours_worked h
    WHERE h.month >= v_month_start
      AND h.month <= v_month_end + INTERVAL '1 month' - INTERVAL '1 day'
      AND (h.employer_hours > 0 OR h.subcontractor_hours > 0)
  ),
  compliance_data AS (
    SELECT 
      e.employer_id,
      e.employer_name,
      e.contact_email,
      COUNT(DISTINCT s.site_id) AS total_sites,
      COUNT(DISTINCT CASE WHEN ah.site_id IS NOT NULL THEN s.site_id END) AS sites_with_hours,
      COUNT(DISTINCT ee.site_id || '-' || ee.check_month) AS total_site_months,
      COUNT(DISTINCT CASE WHEN ah.site_id IS NULL THEN ee.site_id || '-' || ee.check_month END) AS missing_site_months,
      MAX(h.created_at) AS last_hours_entry
    FROM employers e
    LEFT JOIN active_sites s ON e.employer_id = s.employer_id
    LEFT JOIN expected_entries ee ON s.site_id = ee.site_id AND s.employer_id = ee.employer_id
    LEFT JOIN actual_hours ah ON ee.site_id = ah.site_id AND ee.check_month = ah.hours_month
    LEFT JOIN hours_worked h ON e.employer_id = h.employer_id
    GROUP BY e.employer_id, e.employer_name, e.contact_email
  )
  SELECT 
    cd.employer_id,
    cd.employer_name,
    cd.total_sites,
    cd.sites_with_hours,
    cd.total_sites - cd.sites_with_hours AS sites_missing_hours,
    CASE 
      WHEN cd.total_site_months = 0 THEN 0
      ELSE ROUND((cd.total_site_months - cd.missing_site_months)::numeric / cd.total_site_months * 100, 1)
    END AS completion_percentage,
    p_months_back AS months_checked,
    cd.missing_site_months,
    cd.total_site_months,
    cd.last_hours_entry,
    cd.contact_email
  FROM compliance_data cd
  ORDER BY 
    cd.missing_site_months DESC, -- Most missing first
    cd.employer_name;
END;
$$;

-- Also create a function to get detailed missing hours for a specific employer
CREATE OR REPLACE FUNCTION get_employer_missing_hours(
  p_user_role_id INTEGER,
  p_employer_id INTEGER,
  p_months_back INTEGER DEFAULT 3
)
RETURNS TABLE (
  site_id INTEGER,
  site_name TEXT,
  site_state TEXT,
  missing_month DATE,
  has_hours BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_start DATE;
  v_month_end DATE;
BEGIN
  -- Only allow Mend staff (roles 1-4) to see all employer data
  IF p_user_role_id IS NULL OR p_user_role_id > 4 THEN
    RAISE EXCEPTION 'Access denied: Only Mend staff can view employer hours details';
  END IF;

  v_month_end := DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day';
  v_month_start := DATE_TRUNC('month', v_month_end - (p_months_back - 1) * INTERVAL '1 month');

  RETURN QUERY
  WITH month_series AS (
    SELECT generate_series(
      v_month_start,
      DATE_TRUNC('month', v_month_end),
      '1 month'::interval
    )::date AS check_month
  ),
  site_months AS (
    SELECT 
      s.site_id,
      s.site_name,
      s.state AS site_state,
      m.check_month
    FROM sites s
    CROSS JOIN month_series m
    WHERE s.employer_id = p_employer_id
      AND s.deleted_at IS NULL
  )
  SELECT 
    sm.site_id,
    sm.site_name,
    sm.site_state,
    sm.check_month AS missing_month,
    EXISTS (
      SELECT 1 FROM hours_worked h 
      WHERE h.site_id = sm.site_id 
        AND DATE_TRUNC('month', h.month)::date = sm.check_month
        AND (h.employer_hours > 0 OR h.subcontractor_hours > 0)
    ) AS has_hours
  FROM site_months sm
  ORDER BY sm.site_name, sm.check_month;
END;
$$;

