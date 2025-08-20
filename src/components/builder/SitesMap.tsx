import { memo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Site } from "@/integrations/supabase/types/site";
import { SiteMarker } from "./map/SiteMarker";
import { useMapbox } from "./map/useMapbox";

interface SitesMapProps {
  sites: Site[];
}

const SitesMap = ({ sites }: SitesMapProps) => {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const { map, setMap } = useMapbox();

  useEffect(() => {
    if (!mapContainer.current) return;

    const newMap = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [149.1300, -35.2809], // Centered on Canberra
      zoom: 11
    });

    setMap(newMap);

    return () => {
      newMap.remove();
    };
  }, [setMap]);

  const handleSiteClick = (siteId: number) => {
    console.log('Navigating to site:', siteId);
    navigate(`/builder/site/${siteId}`);
  };

  return (
    <div className="relative w-full h-[400px]">
      <div ref={mapContainer} className="absolute inset-0" />
      {map && sites.map(site => (
        <SiteMarker
          key={site.site_id}
          site={site}
          onClick={() => handleSiteClick(site.site_id)}
        />
      ))}
    </div>
  );
};

export default memo(SitesMap);