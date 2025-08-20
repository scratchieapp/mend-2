import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Site } from "@/integrations/supabase/types/site";

interface SiteCardProps {
  site: Site;
}

export const SiteCard = ({ site }: SiteCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/builder/site/${site.site_id}`);
  };

  return (
    <Card 
      className="cursor-pointer hover:bg-accent transition-colors"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <h3 className="font-semibold mb-2">{site.site_name}</h3>
        <div className="text-sm text-muted-foreground">
          <p>{site.city}, {site.state}</p>
          {site.project_type && <p>Type: {site.project_type}</p>}
        </div>
      </CardContent>
    </Card>
  );
};