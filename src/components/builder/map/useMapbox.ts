import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/lib/supabase';

interface MapboxHookReturn {
  map: mapboxgl.Map | null;
  setMap: (map: mapboxgl.Map) => void;
}

export const useMapbox = (): MapboxHookReturn => {
  const [map, setMapState] = useState<mapboxgl.Map | null>(null);
  const tokenRef = useRef<string>('');

  useEffect(() => {
    const fetchMapboxToken = async () => {
      const { data: { MAPBOX_PUBLIC_TOKEN }, error } = await supabase.functions.invoke('get-config', {
        body: { key: 'MAPBOX_PUBLIC_TOKEN' }
      });
      
      if (error) {
        console.error('Error fetching Mapbox token:', error);
        return;
      }
      
      if (MAPBOX_PUBLIC_TOKEN) {
        tokenRef.current = MAPBOX_PUBLIC_TOKEN;
        mapboxgl.accessToken = MAPBOX_PUBLIC_TOKEN;
      }
    };

    fetchMapboxToken();
  }, []);

  const setMap = (newMap: mapboxgl.Map) => {
    setMapState(newMap);
  };

  return { map, setMap };
};