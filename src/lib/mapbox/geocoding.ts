import { supabase } from '@/integrations/supabase/client';

interface GeocodeResult {
  lng: number;
  lat: number;
  formatted_address?: string;
  place_name?: string;
}

interface SiteAddress {
  street_address?: string;
  city: string;
  post_code?: string;
  state: string;
}

// Cache for geocoding results to avoid repeated API calls
const geocodeCache = new Map<string, GeocodeResult>();

/**
 * Get Mapbox access token from environment variables
 */
export const getMapboxToken = (): string => {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  if (!token) {
    console.warn('Mapbox access token not found in environment variables');
  }
  return token || '';
};

/**
 * Geocode a full address using Mapbox Geocoding API
 */
export const geocodeFullAddress = async (address: SiteAddress): Promise<GeocodeResult | null> => {
  const token = getMapboxToken();
  if (!token) {
    console.error('Mapbox token not available');
    return null;
  }

  // Build the full address string
  const addressParts = [
    address.street_address,
    address.city,
    address.state,
    address.post_code,
    'Australia'
  ].filter(Boolean).join(', ');

  const cacheKey = addressParts.toLowerCase();
  
  // Check cache first
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressParts)}.json?` +
      `access_token=${token}&` +
      `country=AU&` +
      `types=address,locality&` +
      `limit=1`
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.features?.[0]) {
      const feature = data.features[0];
      const [lng, lat] = feature.center;
      const result: GeocodeResult = { 
        lng, 
        lat,
        formatted_address: feature.place_name,
        place_name: feature.text
      };
      
      // Cache the result
      geocodeCache.set(cacheKey, result);
      return result;
    }

    // If full address fails, try with just city and state
    if (address.street_address) {
      console.log('Full address geocoding failed, trying city-level fallback');
      return geocodeCityFallback(address.city, address.state);
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
    // Try fallback to city-level geocoding
    return geocodeCityFallback(address.city, address.state);
  }

  return null;
};

/**
 * Fallback geocoding for just city and state
 */
export const geocodeCityFallback = async (city: string, state: string): Promise<GeocodeResult | null> => {
  const token = getMapboxToken();
  if (!token) return null;

  const cacheKey = `${city}-${state}`.toLowerCase();
  
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        `${city}, ${state}, Australia`
      )}.json?access_token=${token}&types=locality,place&limit=1`
    );
    
    const data = await response.json();

    if (data.features?.[0]) {
      const feature = data.features[0];
      const [lng, lat] = feature.center;
      const result: GeocodeResult = { 
        lng, 
        lat,
        formatted_address: feature.place_name,
        place_name: feature.text
      };
      
      geocodeCache.set(cacheKey, result);
      return result;
    }
  } catch (error) {
    console.error('Error geocoding city:', error);
  }

  return null;
};

/**
 * Update site with geocoded coordinates
 */
export const updateSiteCoordinates = async (
  siteId: number, 
  coordinates: { lng: number; lat: number }
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('sites')
      .update({
        longitude: coordinates.lng,
        latitude: coordinates.lat,
        geocoded_at: new Date().toISOString()
      })
      .eq('site_id', siteId);

    if (error) {
      console.error('Error updating site coordinates:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating site:', error);
    return false;
  }
};

/**
 * Geocode and update a site's coordinates
 */
export const geocodeAndUpdateSite = async (siteId: number): Promise<GeocodeResult | null> => {
  try {
    // Fetch site data
    const { data: site, error } = await supabase
      .from('sites')
      .select('street_address, city, post_code, state')
      .eq('site_id', siteId)
      .single();

    if (error || !site) {
      console.error('Error fetching site:', error);
      return null;
    }

    // Geocode the address
    const result = await geocodeFullAddress(site);
    
    if (result) {
      // Update the site with coordinates
      await updateSiteCoordinates(siteId, result);
    }

    return result;
  } catch (error) {
    console.error('Error in geocodeAndUpdateSite:', error);
    return null;
  }
};

/**
 * Batch geocode multiple sites
 */
export const batchGeocodeSites = async (siteIds: number[]): Promise<Map<number, GeocodeResult>> => {
  const results = new Map<number, GeocodeResult>();
  
  for (const siteId of siteIds) {
    const result = await geocodeAndUpdateSite(siteId);
    if (result) {
      results.set(siteId, result);
    }
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return results;
};

/**
 * Validate if an address can be geocoded
 */
export const validateAddress = async (address: SiteAddress): Promise<{
  isValid: boolean;
  coordinates?: GeocodeResult;
  error?: string;
}> => {
  try {
    const result = await geocodeFullAddress(address);
    
    if (result) {
      return {
        isValid: true,
        coordinates: result
      };
    }

    return {
      isValid: false,
      error: 'Address could not be geocoded. Please check the address details.'
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Error validating address. Please try again.'
    };
  }
};