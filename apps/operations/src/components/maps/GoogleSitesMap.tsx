import { useEffect, useRef, useCallback } from "react";
import { Map as MapIcon } from "lucide-react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";

// Types
export interface SiteLocation {
  site_id: number;
  site_name: string;
  employer_name?: string;
  employer_id?: number;
  street_address?: string;
  city: string;
  state: string;
  post_code: string;
  latitude?: number;
  longitude?: number;
  status?: 'working' | 'paused' | 'finished' | string;
  incident_count?: number;
}

export interface HeadOffice {
  employer_id: number;
  employer_name: string;
  employer_address?: string;
  employer_state?: string;
  employer_post_code?: string;
  latitude?: number;
  longitude?: number;
}

interface GoogleSitesMapProps {
  sites: SiteLocation[];
  headOffices?: HeadOffice[];
  className?: string;
  height?: string | number;
  onSiteClick?: (site: SiteLocation) => void;
  onHeadOfficeClick?: (office: HeadOffice) => void;
  mode?: 'default' | 'public' | 'read_only';
  showWeatherOverlay?: boolean;
  showLegend?: boolean;
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
  // Hunter Region NSW
  'kurri kurri': { lat: -32.8198, lng: 151.4831 },
  'maitland': { lat: -32.7330, lng: 151.5549 },
  'cessnock': { lat: -32.8318, lng: 151.3570 },
  'singleton': { lat: -32.5688, lng: 151.1750 },
  // Central Coast NSW
  'gosford': { lat: -33.4266, lng: 151.3416 },
  'wyong': { lat: -33.2833, lng: 151.4167 },
  // Other NSW
  'parramatta': { lat: -33.8150, lng: 151.0012 },
  'penrith': { lat: -33.7510, lng: 150.6920 },
  'liverpool': { lat: -33.9200, lng: 150.9260 },
  'blacktown': { lat: -33.7690, lng: 150.9060 },
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

// State capital coordinates for head office fallback
const STATE_CAPITALS: Record<string, { lat: number; lng: number }> = {
  'NSW': { lat: -33.8688, lng: 151.2093 },
  'VIC': { lat: -37.8136, lng: 144.9631 },
  'QLD': { lat: -27.4698, lng: 153.0260 },
  'WA': { lat: -31.9505, lng: 115.8605 },
  'SA': { lat: -34.9285, lng: 138.6007 },
  'NT': { lat: -12.4634, lng: 130.8456 },
  'TAS': { lat: -42.8821, lng: 147.3272 },
  'ACT': { lat: -35.2809, lng: 149.1300 },
};

// Generate distinct colors for employers
const EMPLOYER_COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green  
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#6366f1', // Indigo
];

export function GoogleSitesMap({ 
  sites, 
  headOffices = [],
  className = "", 
  height = "600px", 
  onSiteClick,
  onHeadOfficeClick,
  mode = 'default',
  showLegend = false,
}: GoogleSitesMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded: mapLoaded } = useGoogleMaps(apiKey);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const headOfficeMarkersRef = useRef<google.maps.Marker[]>([]);
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
      return;
    }

    try {
      // Clear existing markers
      if (markersRef.current.length > 0) {
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
      }
      if (headOfficeMarkersRef.current.length > 0) {
        headOfficeMarkersRef.current.forEach(marker => marker.setMap(null));
        headOfficeMarkersRef.current = [];
      }

      // Reuse existing map if available, otherwise create new one
      let map = googleMapRef.current;
      if (!map) {
        map = new google.maps.Map(mapRef.current, {
          center: { lat: -25.2744, lng: 133.7751 },
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

      // Create bounds to fit all markers
      const bounds = new google.maps.LatLngBounds();
      let hasValidMarkers = false;

      // Build employer color map for consistent coloring
      const employerColorMap = new Map<number, string>();
      const uniqueEmployers = [...new Set(sites.map(s => s.employer_id).filter(Boolean))];
      uniqueEmployers.forEach((empId, index) => {
        if (empId) {
          employerColorMap.set(empId, EMPLOYER_COLORS[index % EMPLOYER_COLORS.length]);
        }
      });

      // Add HEAD OFFICE markers first (so they appear "below" site markers)
      headOffices.forEach((office) => {
        // Try to get coordinates from state capital
        const stateCoords = office.employer_state ? STATE_CAPITALS[office.employer_state.toUpperCase()] : null;
        const coords = office.latitude && office.longitude
          ? { lat: Number(office.latitude), lng: Number(office.longitude) }
          : stateCoords;

        if (!coords) return;

        bounds.extend(coords);
        hasValidMarkers = true;

        // Create custom SVG icon for head office (red square with building icon)
        const headOfficeSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            <rect x="4" y="4" width="24" height="24" rx="3" fill="#dc2626" stroke="#991b1b" stroke-width="2"/>
            <path d="M12 10h8v12h-8V10z" fill="white"/>
            <path d="M14 12h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z" fill="#dc2626"/>
          </svg>
        `;

        const headOfficeIcon = {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(headOfficeSvg),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        };

        const marker = new google.maps.Marker({
          map,
          position: coords,
          title: `${office.employer_name} - Head Office`,
          icon: headOfficeIcon,
          zIndex: 1000, // Head offices on top
        });

        marker.addListener('click', () => {
          if (onHeadOfficeClick) {
            onHeadOfficeClick(office);
          }

          const siteCount = sites.filter(s => s.employer_id === office.employer_id).length;
          const content = `
            <div style="padding: 12px; max-width: 280px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <div style="width: 24px; height: 24px; background: #dc2626; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                  </svg>
                </div>
                <h3 style="margin: 0; font-weight: 600; font-size: 14px;">${office.employer_name}</h3>
              </div>
              <p style="margin: 0 0 4px 0; color: #dc2626; font-weight: 500; font-size: 12px;">HEAD OFFICE</p>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${office.employer_address || ''}</p>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">${office.employer_state || ''} ${office.employer_post_code || ''}</p>
              <div style="padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <span style="font-size: 11px; color: #666;">${siteCount} active site${siteCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          `;
          infoWindow.setContent(content);
          infoWindow.open(map, marker);
        });

        headOfficeMarkersRef.current.push(marker);
      });

      // Add SITE markers
      sites.forEach(site => {
        const coords = site.latitude && site.longitude 
          ? { lat: Number(site.latitude), lng: Number(site.longitude) }
          : getCoordinatesFromCity(site.city);

        if (!coords) return;

        bounds.extend(coords);
        hasValidMarkers = true;

        // Get employer color or use status-based color
        let markerColor = '#22c55e';
        let markerIcon = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';
        
        if (mode === 'public' || mode === 'read_only') {
          markerColor = '#3b82f6';
          markerIcon = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';
        } else if (site.status === 'paused') {
          markerColor = '#f59e0b';
          markerIcon = 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
        } else if (site.status === 'finished') {
          markerColor = '#6b7280';
          markerIcon = 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png';
        }

        const marker = new google.maps.Marker({
          map,
          position: coords,
          title: site.site_name,
          icon: markerIcon,
          animation: google.maps.Animation.DROP,
          zIndex: 100,
        });

        marker.addListener('click', () => {
          if (onSiteClick) {
            onSiteClick(site);
          }

          let content = '';
          
          if (mode === 'public' || mode === 'read_only') {
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

      // Auto-fit map to show all markers with padding
      if (hasValidMarkers && (markersRef.current.length > 0 || headOfficeMarkersRef.current.length > 0)) {
        map.fitBounds(bounds);
        
        google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          const currentZoom = map.getZoom();
          if (currentZoom && currentZoom > 15) {
            map.setZoom(15);
          }
          const totalMarkers = markersRef.current.length + headOfficeMarkersRef.current.length;
          if (totalMarkers === 1 && currentZoom && currentZoom > 14) {
            map.setZoom(14);
          }
        });
      }

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [mapLoaded, sites, headOffices, onSiteClick, onHeadOfficeClick, mode]);

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

  // When using height="100%", the wrapper needs to also be 100% height
  const wrapperStyle = typeof height === 'string' && height.includes('%') 
    ? { height } 
    : {};

  return (
    <div className="relative" style={wrapperStyle}>
      <div 
        ref={mapRef} 
        className={`w-full rounded-lg border bg-slate-100 ${className}`}
        style={{ height }}
      />
      {showLegend && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 text-sm z-10">
          <div className="font-medium mb-2 text-gray-700">Legend</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-600 rounded flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10z"/>
                </svg>
              </div>
              <span className="text-gray-600">Head Office</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
              <span className="text-gray-600">Active Site</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-sm"></div>
              <span className="text-gray-600">Paused Site</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-400 border-2 border-white shadow-sm"></div>
              <span className="text-gray-600">Finished Site</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

