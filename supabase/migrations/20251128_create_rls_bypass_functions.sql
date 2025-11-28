-- Create Employer bypassing RLS
CREATE OR REPLACE FUNCTION create_employer_bypassing_rls(p_employer_name TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employer_id INTEGER;
BEGIN
  -- Check if exists first
  SELECT employer_id INTO v_employer_id FROM employers WHERE employer_name ILIKE p_employer_name LIMIT 1;
  
  IF v_employer_id IS NOT NULL THEN
    RETURN v_employer_id;
  END IF;

  -- Insert
  INSERT INTO employers (employer_name) VALUES (p_employer_name) RETURNING employer_id INTO v_employer_id;
  RETURN v_employer_id;
END;
$$;

-- Create Site bypassing RLS
CREATE OR REPLACE FUNCTION create_site_bypassing_rls(p_site_name TEXT, p_employer_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site_id INTEGER;
BEGIN
  -- Check if exists
  SELECT site_id INTO v_site_id FROM sites WHERE site_name ILIKE p_site_name AND (employer_id = p_employer_id OR (employer_id IS NULL AND p_employer_id IS NULL)) LIMIT 1;
  
  IF v_site_id IS NOT NULL THEN
    RETURN v_site_id;
  END IF;

  -- Insert
  INSERT INTO sites (site_name, employer_id) VALUES (p_site_name, p_employer_id) RETURNING site_id INTO v_site_id;
  RETURN v_site_id;
END;
$$;

-- Create Worker bypassing RLS (Simple version for transformation)
CREATE OR REPLACE FUNCTION create_worker_bypassing_rls(p_given_name TEXT, p_family_name TEXT, p_employer_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_worker_id INTEGER;
BEGIN
  -- Check if exists
  SELECT worker_id INTO v_worker_id FROM workers 
  WHERE given_name ILIKE p_given_name 
  AND family_name ILIKE p_family_name 
  AND (employer_id = p_employer_id OR (employer_id IS NULL AND p_employer_id IS NULL))
  LIMIT 1;
  
  IF v_worker_id IS NOT NULL THEN
    RETURN v_worker_id;
  END IF;

  -- Insert
  INSERT INTO workers (given_name, family_name, employer_id, created_at) 
  VALUES (p_given_name, p_family_name, p_employer_id, NOW()) 
  RETURNING worker_id INTO v_worker_id;
  
  RETURN v_worker_id;
END;
$$;
