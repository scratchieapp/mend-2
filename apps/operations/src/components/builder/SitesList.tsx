import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmployerContext } from "@/hooks/useEmployerContext";
import { SitesGrid } from "./sites/SitesGrid";
import { LoadingSkeleton } from "./sites/LoadingSkeleton";
import { ErrorState } from "./sites/ErrorState";
import { useSites } from "./sites/useSites";

export const SitesList = () => {
  const { selectedEmployerId } = useEmployerContext();
  const { data: sites = [], isLoading, error } = useSites(selectedEmployerId);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sites</CardTitle>
      </CardHeader>
      <CardContent>
        <SitesGrid sites={sites} />
      </CardContent>
    </Card>
  );
};