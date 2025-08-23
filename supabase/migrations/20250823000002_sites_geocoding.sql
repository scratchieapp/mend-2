-- Migration to add geocoding columns to sites table

-- Add longitude and latitude columns to sites table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='sites' AND column_name='longitude'
  ) THEN
    ALTER TABLE sites ADD COLUMN longitude DECIMAL(10, 7);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='sites' AND column_name='latitude'
  ) THEN
    ALTER TABLE sites ADD COLUMN latitude DECIMAL(10, 7);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='sites' AND column_name='geocoded_at'
  ) THEN
    ALTER TABLE sites ADD COLUMN geocoded_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create an index on the geocoding columns for performance
CREATE INDEX IF NOT EXISTS idx_sites_coordinates ON sites(longitude, latitude) WHERE longitude IS NOT NULL AND latitude IS NOT NULL;

-- Update site 72 (Art Gallery) with geocoded coordinates for Newtown, NSW
UPDATE sites 
SET 
  longitude = 151.1796,
  latitude = -33.8966,
  geocoded_at = now()
WHERE site_id = 72 AND longitude IS NULL;

-- Grant permissions
GRANT UPDATE (longitude, latitude, geocoded_at) ON sites TO authenticated;