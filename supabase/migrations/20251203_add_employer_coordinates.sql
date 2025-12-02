-- Add latitude and longitude columns to employers table for map display
ALTER TABLE employers 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add comment for documentation
COMMENT ON COLUMN employers.latitude IS 'GPS latitude coordinate from Google Places API';
COMMENT ON COLUMN employers.longitude IS 'GPS longitude coordinate from Google Places API';

