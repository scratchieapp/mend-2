import { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

interface MapboxHookReturn {
  map: mapboxgl.Map | null;
  setMap: (map: mapboxgl.Map) => void;
}

export const useMapbox = (): MapboxHookReturn => {
  const [map, setMapState] = useState<mapboxgl.Map | null>(null);

  useEffect(() => {
    // Use the environment variable directly
    const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    
    if (mapboxToken) {
      mapboxgl.accessToken = mapboxToken;
    } else {
      console.error('Mapbox access token is not configured. Please add VITE_MAPBOX_ACCESS_TOKEN to your .env file.');
    }
  }, []);

  const setMap = (newMap: mapboxgl.Map) => {
    setMapState(newMap);
  };

  return { map, setMap };
};