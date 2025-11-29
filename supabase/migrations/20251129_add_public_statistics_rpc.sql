-- Function to get aggregated public statistics
-- Returns JSON with non-sensitive data

CREATE OR REPLACE FUNCTION public.get_public_statistics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS to calculate aggregates
AS $$
DECLARE
  total_incidents integer;
  monthly_trend text;
  result json;
BEGIN
  -- Get total incidents count (safe aggregate)
  SELECT count(*) INTO total_incidents FROM incidents;
  
  -- Determine trend (mock logic for now, or compare current month to last)
  monthly_trend := 'stable';
  
  SELECT json_build_object(
    'totalIncidents', total_incidents,
    'averageDaysLost', 5, -- Placeholder/Average
    'topInjuryTypes', (
      SELECT json_agg(t) 
      FROM (
        SELECT 'Sprains & Strains' as type, '30%' as percentage
        UNION ALL SELECT 'Cuts & Lacerations', '20%'
        UNION ALL SELECT 'Falls', '15%'
        LIMIT 3
      ) t
    ),
    'monthlyTrend', monthly_trend
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission to anon (public) and authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_statistics() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_statistics() TO authenticated;

