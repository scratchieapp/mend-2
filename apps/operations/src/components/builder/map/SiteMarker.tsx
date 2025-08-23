import { memo } from 'react';
import { Site } from "@/integrations/supabase/types/site";

interface SiteMarkerProps {
  site: Site;
  onClick: () => void;
}

export const SiteMarker = memo(({ site, onClick }: SiteMarkerProps) => {
  return (
    <div 
      className="absolute cursor-pointer"
      onClick={onClick}
    >
      <div className="bg-primary text-primary-foreground px-2 py-1 rounded shadow-lg">
        {site.site_name}
      </div>
    </div>
  );
});

SiteMarker.displayName = 'SiteMarker';