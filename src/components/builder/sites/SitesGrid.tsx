import { Site } from "@/integrations/supabase/types/site";
import { SiteCard } from "./SiteCard";

interface SitesGridProps {
  sites: Site[];
}

export const SitesGrid = ({ sites }: SitesGridProps) => {
  if (sites.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        No sites found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sites.map((site) => (
        <SiteCard
          key={site.site_id}
          site={site}
        />
      ))}
    </div>
  );
};