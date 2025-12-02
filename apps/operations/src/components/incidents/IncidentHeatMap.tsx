import { useEffect, useRef, useCallback, useMemo } from "react";
import { Map as MapIcon, AlertTriangle } from "lucide-react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface SiteIncidentData {
  site_id: number;
  site_name: string;
  employer_name: string;
  city: string;
  state: string;
  post_code: string;
  latitude?: number;
  longitude?: number;
  lti_count: number;
  mti_count: number;
  fai_count: number;
  total_incidents: number;
}

interface IncidentHeatMapProps {
  employerId: number | null;
  userRoleId: number | null;
  className?: string;
  height?: string | number;
  aspectRatio?: string; // e.g., "1/1" for square
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
  'kurri kurri': { lat: -32.8198, lng: 151.4831 },
  'maitland': { lat: -32.7330, lng: 151.5549 },
  'cessnock': { lat: -32.8318, lng: 151.3570 },
  'singleton': { lat: -32.5688, lng: 151.1750 },
  'gosford': { lat: -33.4266, lng: 151.3416 },
  'wyong': { lat: -33.2833, lng: 151.4167 },
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
      return {
        lat: coords.lat + (Math.random() - 0.5) * 0.05,
        lng: coords.lng + (Math.random() - 0.5) * 0.05
      };
    }
  }
  return null;
};

// Classification colors
const INCIDENT_COLORS = {
  lti: '#dc2626',    // Red for LTI
  mti: '#f97316',    // Orange for MTI
  fai: '#eab308',    // Yellow for First Aid
  none: '#22c55e',   // Green for no incidents
};

// Create a colored circle marker element with size based on incident count
const createIncidentMarker = (
  classification: 'lti' | 'mti' | 'fai' | 'none',
  totalIncidents: number
): HTMLElement => {
  const color = INCIDENT_COLORS[classification];
  // Scale marker size based on incident count (min 24, max 48)
  const baseSize = 24;
  const scale = Math.min(2, 1 + (totalIncidents / 20));
  const size = Math.round(baseSize * scale);
  
  const div = document.createElement('div');
  div.innerHTML = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${Math.max(10, size / 2.5)}px;
      font-weight: bold;
      color: white;
      cursor: pointer;
      transition: transform 0.15s ease;
    " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
      ${totalIncidents > 0 ? totalIncidents : ''}
    </div>
  `;
  return div;
};

// Get the highest severity classification for a site
const getHighestSeverity = (site: SiteIncidentData): 'lti' | 'mti' | 'fai' | 'none' => {
  if (site.lti_count > 0) return 'lti';
  if (site.mti_count > 0) return 'mti';
  if (site.fai_count > 0) return 'fai';
  return 'none';
};

export function IncidentHeatMap({ 
  employerId, 
  userRoleId,
  className = "", 
  height,
  aspectRatio = "1/1", // Default to square
}: IncidentHeatMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded: mapLoaded } = useGoogleMaps();
  
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const isMendStaff = !!(userRoleId && userRoleId >= 1 && userRoleId <= 4);

  // Fetch site incident data
  const { data: siteData = [], isLoading } = useQuery({
    queryKey: ['site-incident-heatmap', employerId, isMendStaff, userRoleId],
    queryFn: async () => {
      // Build query for sites
      let query = supabase
        .from('sites')
        .select(`
          site_id,
          site_name,
          city,
          state,
          post_code,
          latitude,
          longitude,
          employer_id,
          employer:employers!inner(employer_name)
        `);

      if (employerId) {
        query = query.eq('employer_id', employerId);
      }

      const { data: sites, error: sitesError } = await query;
      if (sitesError) throw sitesError;

      // Use the same RPC as IncidentsChart to get incidents (respects RBAC)
      const { data: dashboardData, error: incError } = await supabase.rpc('get_dashboard_data', {
        page_size: 10000, // Get all incidents
        page_offset: 0,
        filter_employer_id: employerId,
        filter_worker_id: null,
        filter_start_date: null, // No date filter - get all time
        filter_end_date: null,
        user_role_id: userRoleId || 5,
        user_employer_id: employerId,
        filter_archive_status: 'active'
      });

      if (incError) throw incError;

      const incidents = dashboardData?.incidents || [];
      console.log('[IncidentHeatMap] Fetched incidents via RPC:', incidents.length, 'for employer:', employerId);

      // Aggregate incidents by site
      const incidentCounts: Record<number, { lti: number; mti: number; fai: number; total: number }> = {};
      
      incidents.forEach((inc: any) => {
        if (!inc.site_id) return; // Skip incidents without site_id
        
        if (!incidentCounts[inc.site_id]) {
          incidentCounts[inc.site_id] = { lti: 0, mti: 0, fai: 0, total: 0 };
        }
        
        const classification = (inc.classification || '').toUpperCase();
        if (classification === 'LTI' || classification === 'LOST TIME INJURY' || classification === 'LOST TIME') {
          incidentCounts[inc.site_id].lti++;
        } else if (classification === 'MTI' || classification === 'MEDICAL TREATMENT INJURY' || classification === 'MEDICAL TREATMENT') {
          incidentCounts[inc.site_id].mti++;
        } else if (classification === 'FAI' || classification === 'FIRST AID' || classification === 'FIRST AID INJURY') {
          incidentCounts[inc.site_id].fai++;
        }
        // Always increment total
        incidentCounts[inc.site_id].total++;
      });
      
      console.log('[IncidentHeatMap] Site incident counts:', incidentCounts);
      console.log('[IncidentHeatMap] Sites with incidents:', Object.keys(incidentCounts).length);

      // Combine sites with incident data
      return sites?.map((site: any) => ({
        site_id: site.site_id,
        site_name: site.site_name,
        employer_name: site.employer?.employer_name || 'Unknown',
        city: site.city,
        state: site.state,
        post_code: site.post_code,
        latitude: site.latitude,
        longitude: site.longitude,
        lti_count: incidentCounts[site.site_id]?.lti || 0,
        mti_count: incidentCounts[site.site_id]?.mti || 0,
        fai_count: incidentCounts[site.site_id]?.fai || 0,
        total_incidents: incidentCounts[site.site_id]?.total || 0,
      })) as SiteIncidentData[];
    },
    enabled: isMendStaff || !!employerId,
  });

  // Summary statistics - total incidents by type across all sites
  const stats = useMemo(() => {
    const totalLTI = siteData.reduce((sum, s) => sum + s.lti_count, 0);
    const totalMTI = siteData.reduce((sum, s) => sum + s.mti_count, 0);
    const totalFAI = siteData.reduce((sum, s) => sum + s.fai_count, 0);
    const totalIncidents = siteData.reduce((sum, s) => sum + s.total_incidents, 0);
    const sitesWithIncidents = siteData.filter(s => s.total_incidents > 0).length;
    const sitesNoIncidents = siteData.filter(s => s.total_incidents === 0).length;
    
    return { 
      totalLTI, 
      totalMTI, 
      totalFAI, 
      totalIncidents,
      sitesWithIncidents,
      sitesNoIncidents, 
      totalSites: siteData.length 
    };
  }, [siteData]);

  const initializeMap = useCallback(async () => {
    if (!mapLoaded || !mapRef.current || !siteData.length) {
      return;
    }

    const hasAdvancedMarker = window.google?.maps?.marker?.AdvancedMarkerElement;
    if (!window.google?.maps?.Map) {
      return;
    }

    if (!hasAdvancedMarker && window.google?.maps?.importLibrary) {
      try {
        await window.google.maps.importLibrary('marker');
      } catch (e) {
        console.error('Failed to load marker library:', e);
      }
    }

    const isVisible = mapRef.current.offsetWidth > 0 || mapRef.current.offsetHeight > 0;
    if (!isVisible) {
      return;
    }

    try {
      // Clear existing markers
      if (markersRef.current.length > 0) {
        markersRef.current.forEach(marker => marker.map = null);
        markersRef.current = [];
      }

      let map = googleMapRef.current;
      if (!map) {
        map = new google.maps.Map(mapRef.current, {
          center: { lat: -25.2744, lng: 133.7751 },
          zoom: 4,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          mapId: 'MEND_INCIDENTS_HEATMAP',
        });
        googleMapRef.current = map;
      }

      if (!infoWindowRef.current) {
        infoWindowRef.current = new google.maps.InfoWindow();
      }
      const infoWindow = infoWindowRef.current;

      const bounds = new google.maps.LatLngBounds();
      let hasValidMarkers = false;

      const AdvancedMarkerElement = window.google?.maps?.marker?.AdvancedMarkerElement;
      if (!AdvancedMarkerElement) {
        console.warn('AdvancedMarkerElement not available');
        return;
      }

      // Add site markers
      siteData.forEach(site => {
        const coords = site.latitude && site.longitude 
          ? { lat: Number(site.latitude), lng: Number(site.longitude) }
          : getCoordinatesFromCity(site.city);

        if (!coords) return;

        bounds.extend(coords);
        hasValidMarkers = true;

        const severity = getHighestSeverity(site);
        
        const marker = new AdvancedMarkerElement({
          map,
          position: coords,
          title: site.site_name,
          content: createIncidentMarker(severity, site.total_incidents),
          zIndex: severity === 'lti' ? 300 : severity === 'mti' ? 200 : severity === 'fai' ? 100 : 50,
        });

        marker.addListener('click', () => {
          const content = `
            <div style="padding: 12px; max-width: 280px; font-family: system-ui, sans-serif;">
              <h3 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;">${site.site_name}</h3>
              <p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">${site.employer_name}</p>
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #888;">${site.city}, ${site.state} ${site.post_code}</p>
              
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center;">
                <div style="background: #fef2f2; padding: 8px; border-radius: 6px;">
                  <div style="font-size: 18px; font-weight: bold; color: #dc2626;">${site.lti_count}</div>
                  <div style="font-size: 10px; color: #dc2626;">LTI</div>
                </div>
                <div style="background: #fff7ed; padding: 8px; border-radius: 6px;">
                  <div style="font-size: 18px; font-weight: bold; color: #f97316;">${site.mti_count}</div>
                  <div style="font-size: 10px; color: #f97316;">MTI</div>
                </div>
                <div style="background: #fefce8; padding: 8px; border-radius: 6px;">
                  <div style="font-size: 18px; font-weight: bold; color: #eab308;">${site.fai_count}</div>
                  <div style="font-size: 10px; color: #eab308;">First Aid</div>
                </div>
              </div>
              
              <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #666;">
                Total: ${site.total_incidents} incident${site.total_incidents !== 1 ? 's' : ''}
              </div>
            </div>
          `;
          infoWindow.setContent(content);
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      });

      // Fit bounds
      if (hasValidMarkers && markersRef.current.length > 0) {
        map.fitBounds(bounds);
        
        google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          const currentZoom = map.getZoom();
          if (currentZoom && currentZoom > 12) {
            map.setZoom(12);
          }
          if (markersRef.current.length === 1 && currentZoom && currentZoom > 10) {
            map.setZoom(10);
          }
        });
      }

    } catch (error) {
      console.error('Error initializing heatmap:', error);
    }
  }, [mapLoaded, siteData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      initializeMap();
    }, 100);
    return () => clearTimeout(timer);
  }, [initializeMap]);

  // Style object - use height if provided, otherwise use aspectRatio
  const containerStyle: React.CSSProperties = height 
    ? { height: typeof height === 'number' ? `${height}px` : height, minHeight: '350px' }
    : { aspectRatio, minHeight: '350px' };

  if (!apiKey) {
    return (
      <div className={`w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border ${className}`} style={containerStyle}>
        <div className="text-center p-4">
          <MapIcon className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Map requires Google Maps API key</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <Skeleton className={`w-full rounded-lg ${className}`} style={containerStyle} />;
  }

  if (siteData.length === 0) {
    return (
      <div className={`w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border ${className}`} style={containerStyle}>
        <div className="text-center p-4">
          <AlertTriangle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No site data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={containerStyle}>
      <div 
        ref={mapRef} 
        className={`w-full h-full rounded-lg border bg-slate-100 ${className}`}
      />
      
      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2.5 text-xs z-10">
        <div className="font-medium mb-1.5 text-gray-700">Incidents ({stats.totalIncidents})</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-white shadow-sm"></div>
            <span className="text-gray-600">LTI ({stats.totalLTI})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-white shadow-sm"></div>
            <span className="text-gray-600">MTI ({stats.totalMTI})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-yellow-500 border-2 border-white shadow-sm"></div>
            <span className="text-gray-600">First Aid ({stats.totalFAI})</span>
          </div>
        </div>
        <div className="border-t mt-1.5 pt-1.5 text-gray-500">
          {stats.sitesWithIncidents} sites with incidents
        </div>
      </div>
      
      {/* Site count */}
      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-1.5 text-xs z-10">
        <span className="font-medium">{stats.total}</span>
        <span className="text-gray-500 ml-1">sites</span>
      </div>
    </div>
  );
}

