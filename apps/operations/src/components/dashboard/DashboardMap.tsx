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

export function DashboardMap({ employerId, height = "400px" }: DashboardMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  
  const { isLoaded, error: loadError } = useGoogleMaps();
  const { data: sites, isLoading, error: sitesError } = useSites(employerId);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !sites) return;

    // Safety check
    if (!window.google?.maps?.Map || !window.google?.maps?.Marker) return;

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
        });
      }

      const map = googleMapRef.current;
      const infoWindow = new google.maps.InfoWindow();

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
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
        let markerIcon = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';
        if (site.status === 'paused') {
          markerIcon = 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
        } else if (site.status === 'finished') {
          markerIcon = 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png'; // Using purple for finished to distinguish
        }

        const marker = new google.maps.Marker({
          map,
          position: coords,
          title: site.site_name,
          icon: markerIcon,
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

