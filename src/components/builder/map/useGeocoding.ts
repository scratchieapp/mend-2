import { useState } from 'react';

interface GeocodeResult {
  lng: number;
  lat: number;
}

export const useGeocoding = (mapboxToken: string) => {
  const [geocodeCache, setGeocodeCache] = useState<Record<string, GeocodeResult>>({});

  const geocodeAddress = async (city: string, state: string): Promise<GeocodeResult | null> => {
    const cacheKey = `${city}-${state}`;
    
    if (geocodeCache[cacheKey]) {
      return geocodeCache[cacheKey];
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          `${city}, ${state}, Australia`
        )}.json?access_token=${mapboxToken}`
      );
      const data = await response.json();

      if (data.features?.[0]) {
        const [lng, lat] = data.features[0].center;
        const result = { lng, lat };
        setGeocodeCache(prev => ({ ...prev, [cacheKey]: result }));
        return result;
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
    }

    return null;
  };

  return { geocodeAddress };
};