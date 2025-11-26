// Australian city coordinates for geocoding fallback
export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'melbourne': { lat: -37.8136, lng: 144.9631 },
  'brisbane': { lat: -27.4698, lng: 153.0260 },
  'perth': { lat: -31.9505, lng: 115.8605 },
  'adelaide': { lat: -34.9285, lng: 138.6007 },
  'darwin': { lat: -12.4634, lng: 130.8456 },
  'hobart': { lat: -42.8821, lng: 147.3272 },
  'canberra': { lat: -35.2809, lng: 149.1300 },
  'gold coast': { lat: -28.0167, lng: 153.4000 },
  'newcastle': { lat: -32.9283, lng: 151.7817 },
  'wollongong': { lat: -34.4278, lng: 150.8931 },
  'geelong': { lat: -38.1499, lng: 144.3617 },
  'townsville': { lat: -19.2576, lng: 146.8237 },
  'cairns': { lat: -16.9186, lng: 145.7781 },
};

// Get coordinates from city name
export const getCoordinatesFromCity = (city?: string): { lat: number; lng: number } | null => {
  if (!city) return null;
  const cityLower = city.toLowerCase();
  for (const [name, coords] of Object.entries(CITY_COORDINATES)) {
    if (cityLower.includes(name) || name.includes(cityLower)) {
      // Add slight random offset to prevent markers from overlapping
      return {
        lat: coords.lat + (Math.random() - 0.5) * 0.1,
        lng: coords.lng + (Math.random() - 0.5) * 0.1
      };
    }
  }
  return null;
};

