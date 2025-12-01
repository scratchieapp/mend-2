import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map as MapIcon } from "lucide-react";
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { useSites } from '@/hooks/useSites';
import { getCoordinatesFromCity } from '@/lib/maps';

interface DashboardMapProps {
  employerId?: number | null;
  height?: string;
}

// Create a colored pin marker element
const createPinElement = (color: string): HTMLElement => {
  const pin = document.createElement('div');
  pin.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="${color}" stroke="#333" stroke-width="1"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>
  `;
  pin.style.cursor = 'pointer';
  return pin;
};

export function DashboardMap({ employerId, height = "400px" }: DashboardMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  
  const { isLoaded, error: loadError } = useGoogleMaps();
  const { data: sites, isLoading, error: sitesError } = useSites(employerId);

  useEffect(() => {
    const initMap = async () => {
      if (!isLoaded || !mapRef.current || !sites) return;

      // Safety check
      if (!window.google?.maps?.Map) return;

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
        // Initialize map if not exists
        if (!googleMapRef.current) {
          googleMapRef.current = new google.maps.Map(mapRef.current, {
            center: { lat: -25.2744, lng: 133.7751 }, // Center of Australia
            zoom: 4,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            mapId: 'MEND_DASHBOARD_MAP', // Required for AdvancedMarkerElement
          });
        }

        const map = googleMapRef.current;
        const infoWindow = new google.maps.InfoWindow();

        // Clear existing markers
        markersRef.current.forEach(marker => marker.map = null);
        markersRef.current = [];

        // Add markers
        const bounds = new google.maps.LatLngBounds();
        let hasValidCoords = false;

        sites.forEach(site => {
          const coords = site.latitude && site.longitude 
            ? { lat: Number(site.latitude), lng: Number(site.longitude) }
            : getCoordinatesFromCity(site.city);

          if (!coords) return;

          hasValidCoords = true;
          bounds.extend(coords);

          // Determine marker color based on status
          let markerColor = '#22c55e'; // Green for active
          if (site.status === 'paused') {
            markerColor = '#f59e0b'; // Amber
          } else if (site.status === 'finished') {
            markerColor = '#6b7280'; // Gray
          }

          const marker = new AdvancedMarkerElement({
            map,
            position: coords,
            title: site.site_name,
            content: createPinElement(markerColor),
          });

          marker.addListener('click', () => {
            const content = `
              <div style="padding: 8px; max-width: 250px;">
                <h3 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;">${site.site_name}</h3>
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${site.employer_name}</p>
                <p style="margin: 0 0 4px 0; font-size: 12px;">${site.city}, ${site.state}</p>
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                  <span style="font-size: 11px; font-weight: 600;">${site.status || 'Active'}</span>
                  <span style="font-size: 11px; color: #666;">• ${site.incident_count} incidents</span>
                </div>
              </div>
            `;
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
          });

          markersRef.current.push(marker);
        });

        // Fit bounds if we have sites, otherwise reset to Australia center
        if (hasValidCoords && sites.length > 0) {
          map.fitBounds(bounds);
          // Don't zoom in too far if only one site
          if (sites.length === 1) {
            map.setZoom(12);
          }
        } else {
          map.setCenter({ lat: -25.2744, lng: 133.7751 });
          map.setZoom(4);
        }

      } catch (error) {
        console.error('Error updating map:', error);
      }
    };

    initMap();
  }, [isLoaded, sites]);

  if (loadError || sitesError) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-red-600">
          Error loading map data
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapIcon className="h-5 w-5" />
          {employerId ? 'Work Sites' : 'Site Overview'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="w-full flex items-center justify-center bg-slate-50 rounded-lg" style={{ height }}>
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
          </div>
        ) : (
          <div 
            ref={mapRef} 
            className="w-full rounded-lg border bg-slate-100"
            style={{ height }}
          />
        )}
      </CardContent>
    </Card>
  );
}
