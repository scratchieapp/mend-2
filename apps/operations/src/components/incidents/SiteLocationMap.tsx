import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import type { Tables } from '@/integrations/supabase/types';

interface SiteLocationMapProps {
  site?: Partial<Tables<'sites'>> & {
    longitude?: number;
    latitude?: number;
  } | null;
  incidentDate?: string | null;
}

// Australian city coordinates for fallback
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'melbourne': { lat: -37.8136, lng: 144.9631 },
  'brisbane': { lat: -27.4698, lng: 153.0260 },
  'perth': { lat: -31.9505, lng: 115.8605 },
  'adelaide': { lat: -34.9285, lng: 138.6007 },
  'darwin': { lat: -12.4634, lng: 130.8456 },
  'hobart': { lat: -42.8821, lng: 147.3272 },
  'canberra': { lat: -35.2809, lng: 149.1300 },
  'newtown': { lat: -33.8976, lng: 151.1790 },
  'parramatta': { lat: -33.8151, lng: 151.0011 },
  'gold coast': { lat: -28.0167, lng: 153.4000 },
  'newcastle': { lat: -32.9283, lng: 151.7817 },
};

// Create a red pin marker element for incidents
const createIncidentPinElement = (): HTMLElement => {
  const pin = document.createElement('div');
  pin.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 24 36">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="#ef4444" stroke="#991b1b" stroke-width="1"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>
  `;
  pin.style.cursor = 'pointer';
  return pin;
};

export function SiteLocationMap({ site, incidentDate }: SiteLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  
  const { isLoaded: mapLoaded } = useGoogleMaps();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Get coordinates from site data or fallback
  const getCoordinates = useCallback(() => {
    // First try to use stored coordinates
    if (site?.latitude && site?.longitude) {
      return { lat: site.latitude, lng: site.longitude };
    }

    // Fallback to city-based coordinates
    if (site?.city) {
      const cityLower = site.city.toLowerCase();
      for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
        if (cityLower.includes(city) || city.includes(cityLower)) {
          return coords;
        }
      }
    }

    // Default to Sydney
    return { lat: -33.8688, lng: 151.2093 };
  }, [site]);

  // Initialize map when loaded
  useEffect(() => {
    const initMap = async () => {
      if (!mapLoaded || !mapRef.current) return;

      // Safety check for Google Maps API
      if (!window.google?.maps?.Map) {
        console.error('Google Maps API not fully loaded');
        return;
      }

      // Try to get AdvancedMarkerElement
      let AdvancedMarkerElement = window.google?.maps?.marker?.AdvancedMarkerElement;
      
      if (!AdvancedMarkerElement && window.google?.maps?.importLibrary) {
        try {
          const markerLib = await window.google.maps.importLibrary('marker') as google.maps.MarkerLibrary;
          AdvancedMarkerElement = markerLib.AdvancedMarkerElement;
        } catch (e) {
          console.error('Failed to load marker library:', e);
          return;
        }
      }

      if (!AdvancedMarkerElement) {
        console.warn('AdvancedMarkerElement not available');
        return;
      }

      try {
        const coords = getCoordinates();
        setCoordinates(coords);

        const map = new google.maps.Map(mapRef.current, {
          center: coords,
          zoom: 15,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: true,
          fullscreenControl: true,
          mapId: 'MEND_SITE_LOCATION_MAP', // Required for AdvancedMarkerElement
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        googleMapRef.current = map;

        // Use AdvancedMarkerElement with red pin for incident location
        const marker = new AdvancedMarkerElement({
          map,
          position: coords,
          title: site?.site_name || 'Incident Location',
          content: createIncidentPinElement(),
        });

        markerRef.current = marker;
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
      }
    };

    initMap();

    return () => {
      if (markerRef.current) {
        markerRef.current.map = null;
      }
    };
  }, [mapLoaded, getCoordinates, site?.site_name]);

  // Build address string
  const getAddressString = () => {
    const parts = [
      site?.street_address,
      site?.city,
      site?.state,
      site?.post_code
    ].filter(Boolean);
    return parts.join(', ');
  };

  // Open in Google Maps
  const openInGoogleMaps = () => {
    if (coordinates) {
      const url = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
      window.open(url, '_blank');
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4 text-blue-600" />
          Site Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Map Container */}
        <div className="relative rounded-lg overflow-hidden border bg-muted" style={{ height: '200px' }}>
          {apiKey ? (
            <div ref={mapRef} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="text-center p-4">
                <MapPin className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Map requires Google Maps API key
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  See GOOGLE_MAPS_SETUP.md for instructions
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Site Info */}
        <div className="space-y-2">
          <div>
            <p className="font-medium text-sm">{site?.site_name || 'Unknown Site'}</p>
            {getAddressString() && (
              <p className="text-xs text-muted-foreground">{getAddressString()}</p>
            )}
          </div>
          
          {incidentDate && (
            <p className="text-xs text-muted-foreground">
              Incident on {format(new Date(incidentDate), 'MMM dd, yyyy')}
            </p>
          )}

          {coordinates && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
              onClick={openInGoogleMaps}
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Open in Google Maps
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Add type declaration for google maps
declare global {
  interface Window {
    google: typeof google;
  }
}
