import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmployerSelection } from "@/hooks/useEmployerSelection";
import { SitesGrid } from "./sites/SitesGrid";
import { LoadingSkeleton } from "./sites/LoadingSkeleton";
import { ErrorState } from "./sites/ErrorState";
import { useSites } from "./sites/useSites";

export const SitesList = () => {
  const { selectedEmployerId } = useEmployerSelection();
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