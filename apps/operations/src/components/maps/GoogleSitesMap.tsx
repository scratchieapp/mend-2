import { useEffect, useRef, useCallback } from "react";
import { Map as MapIcon } from "lucide-react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";

// Types
export interface SiteLocation {
  site_id: number;
  site_name: string;
  employer_name?: string;
  street_address?: string;
  city: string;
  state: string;
  post_code: string;
  latitude?: number;
  longitude?: number;
  status?: 'working' | 'paused' | 'finished' | string;
  incident_count?: number;
}

interface GoogleSitesMapProps {
  sites: SiteLocation[];
  className?: string;
  height?: string | number;
  onSiteClick?: (site: SiteLocation) => void;
  mode?: 'default' | 'public' | 'read_only';
  showWeatherOverlay?: boolean;
}

// Australian city coordinates for geocoding fallback
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
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
const getCoordinatesFromCity = (city?: string): { lat: number; lng: number } | null => {
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

export function GoogleSitesMap({ 
  sites, 
  className = "", 
  height = "600px", 
  onSiteClick,
  mode = 'default'
}: GoogleSitesMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded: mapLoaded } = useGoogleMaps(apiKey);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const initializeMap = useCallback(() => {
    if (!mapLoaded || !mapRef.current || !sites) {
      return;
    }

    // Safety check for Google Maps API
    if (!window.google?.maps?.Map || !window.google?.maps?.Marker) {
      return;
    }

    // Check if map container is visible
    const isVisible = mapRef.current.offsetWidth > 0 || mapRef.current.offsetHeight > 0 || mapRef.current.offsetParent !== null;
    if (!isVisible) {
      // Don't retry here - rely on useEffect deps or resize observer
      return;
    }

    try {
      // Clear existing markers
      if (markersRef.current.length > 0) {
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
      }

      // Reuse existing map if available, otherwise create new one
      let map = googleMapRef.current;
      if (!map) {
        map = new google.maps.Map(mapRef.current, {
          center: { lat: -25.2744, lng: 133.7751 }, // Center of Australia
          zoom: 4,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });
        googleMapRef.current = map;
      }

      // Create a single info window to reuse
      if (!infoWindowRef.current) {
        infoWindowRef.current = new google.maps.InfoWindow();
      }
      const infoWindow = infoWindowRef.current;

      // Add markers for each site
      sites.forEach(site => {
        const coords = site.latitude && site.longitude 
          ? { lat: Number(site.latitude), lng: Number(site.longitude) }
          : getCoordinatesFromCity(site.city);

        if (!coords) return;

        // Determine marker color based on status or mode
        let markerColor = '#22c55e'; // Green for active (working)
        let markerIcon = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';
        
        if (mode === 'public' || mode === 'read_only') {
          // Neutral color for public/read-only mode
          markerColor = '#3b82f6'; // Blue
          markerIcon = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';
        } else if (site.status === 'paused') {
          markerColor = '#f59e0b'; // Amber for paused
          markerIcon = 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
        } else if (site.status === 'finished') {
          markerColor = '#6b7280'; // Grey for finished
          markerIcon = 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png';
        }

        // Create marker
        const marker = new google.maps.Marker({
          map,
          position: coords,
          title: site.site_name,
          icon: markerIcon,
        });

        // Add click listener for info window
        marker.addListener('click', () => {
          if (onSiteClick) {
            onSiteClick(site);
          }

          let content = '';
          
          if (mode === 'public' || mode === 'read_only') {
            // Simplified info window for public mode
            content = `
              <div style="padding: 8px; max-width: 250px;">
                <h3 style="margin: 0 0 8px 0; font-weight: 600;">${site.site_name}</h3>
                <p style="margin: 0 0 4px 0; font-size: 12px;">${site.street_address || ''}</p>
                <p style="margin: 0 0 8px 0; font-size: 12px;">${site.city}, ${site.state} ${site.post_code}</p>
                <div style="display: flex; gap: 8px; align-items: center;">
                   <a href="https://maps.google.com/?q=${encodeURIComponent((site.street_address ? site.street_address + ', ' : '') + site.city + ', ' + site.state)}" target="_blank" style="color: #3b82f6; text-decoration: none; font-size: 12px;">Get Directions</a>
                </div>
              </div>
            `;
          } else {
            // Standard info window
            content = `
              <div style="padding: 8px; max-width: 250px;">
                <h3 style="margin: 0 0 8px 0; font-weight: 600;">${site.site_name}</h3>
                <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">${site.employer_name || ''}</p>
                <p style="margin: 0 0 4px 0; font-size: 12px;">${site.street_address || ''}</p>
                <p style="margin: 0 0 8px 0; font-size: 12px;">${site.city}, ${site.state} ${site.post_code}</p>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <span style="
                    background: ${markerColor};
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    min-width: 60px;
                    text-align: center;
                  ">${site.status || 'Active'}</span>
                  <span style="font-size: 11px; color: #666;">${site.incident_count || 0} incidents</span>
                </div>
              </div>
            `;
          }
          
          infoWindow.setContent(content);
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      });

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [mapLoaded, sites, onSiteClick]);

  // Initialize map when loaded or sites change
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initializeMap();
    }, 100);
    return () => clearTimeout(timer);
  }, [initializeMap]);

  if (!apiKey) {
    return (
      <div className={`w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border ${className}`} style={{ height }}>
        <div className="text-center p-8">
          <MapIcon className="h-16 w-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Map requires Google Maps API key</h3>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      className={`w-full rounded-lg border bg-slate-100 ${className}`}
      style={{ height }}
    />
  );
}

