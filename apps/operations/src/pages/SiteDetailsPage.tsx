import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteSafetySummary } from "@/components/builder/SiteSafetySummary";

const SiteDetailsPage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  
  const numericSiteId = siteId ? parseInt(siteId) : null;

  const { data: site, isLoading, error } = useQuery({
    queryKey: ['site', numericSiteId],
    queryFn: async () => {
      if (!numericSiteId) {
        throw new Error(`Invalid site ID: ${siteId}`);
      }

      const { data, error } = await supabase
        .from('sites')
        .select(`
          site_id,
          site_name,
          city,
          state,
          project_type,
          employer_id,
          incidents(count)
        `)
        .eq('site_id', numericSiteId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error(`Site not found: ${numericSiteId}`);

      return data;
    },
    enabled: !!numericSiteId
  });

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Error Loading Site</h1>
          <p className="text-muted-foreground">{error.message}</p>
          <button 
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading site details...</p>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Site Not Found</h1>
          <p className="text-muted-foreground">The requested site (ID: {numericSiteId}) could not be found.</p>
          <button 
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container mx-auto p-6">
        {numericSiteId && <SiteSafetySummary siteId={numericSiteId} />}
      </div>
    </div>
  );
};

export default SiteDetailsPage;