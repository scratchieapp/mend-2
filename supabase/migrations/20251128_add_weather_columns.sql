-- Add weather columns to incidents table
-- These capture weather conditions at the time and location of the incident

ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS weather_data JSONB DEFAULT NULL;

-- The weather_data JSONB column will store structured weather information:
-- {
--   "captured_at": "2025-11-28T10:30:00Z",
--   "temperature_c": 25.5,
--   "feels_like_c": 27.0,
--   "humidity_percent": 65,
--   "conditions": "Partly cloudy",
--   "conditions_code": "partly_cloudy",
--   "wind_speed_kmh": 15.5,
--   "wind_direction": "NW",
--   "wind_gust_kmh": 22.0,
--   "precipitation_mm": 0,
--   "uv_index": 6,
--   "visibility_km": 10,
--   "pressure_hpa": 1015,
--   "cloud_cover_percent": 40,
--   "source": "google_weather_api",
--   "location": {
--     "latitude": -33.8688,
--     "longitude": 151.2093,
--     "timezone": "Australia/Sydney"
--   }
-- }

COMMENT ON COLUMN public.incidents.weather_data IS 'Weather conditions at incident time/location captured from Google Weather API';

-- Create index for querying weather data
CREATE INDEX IF NOT EXISTS idx_incidents_weather_data ON public.incidents USING GIN (weather_data);

