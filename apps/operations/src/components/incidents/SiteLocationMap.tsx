import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
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

export function SiteLocationMap({ site, incidentDate }: SiteLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

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

  // Load Google Maps script
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not found. Map will not be displayed.');
      return;
    }

    // Check if already loaded
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setMapLoaded(true));
      return;
    }

    // Load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => console.error('Failed to load Google Maps');
    document.head.appendChild(script);
  }, []);

  // Initialize map when loaded
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const coords = getCoordinates();
    setCoordinates(coords);

    const map = new google.maps.Map(mapRef.current, {
      center: coords,
      zoom: 15,
      mapId: 'incident-location-map',
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: true,
      fullscreenControl: true,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    googleMapRef.current = map;

    // Create custom marker
    const markerContent = document.createElement('div');
    markerContent.innerHTML = `
      <div style="
        background: #ef4444;
        border: 3px solid white;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        cursor: pointer;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `;

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: coords,
      content: markerContent,
      title: site?.site_name || 'Incident Location'
    });

    markerRef.current = marker;

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

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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

