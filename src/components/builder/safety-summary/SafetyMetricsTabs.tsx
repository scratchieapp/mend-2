import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncidentsList } from "./IncidentsList";
import { MetricsOverview } from "./MetricsOverview";
import { IncidentTypesSection } from "@/components/monthly-reports/sections/IncidentTypesSection";
import { format } from "date-fns";

interface SafetyMetricsTabsProps {
  siteId: number;
  month: Date;
}

export function SafetyMetricsTabs({ siteId, month }: SafetyMetricsTabsProps) {
  // Convert the Date to an ISO string format for the IncidentTypesSection
  const monthString = format(month, 'yyyy-MM-dd');

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="incidents">Incidents</TabsTrigger>
        <TabsTrigger value="types">Incident Types</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview">
        <MetricsOverview siteId={siteId} month={month} />
      </TabsContent>

      <TabsContent value="incidents">
        <IncidentsList siteId={siteId} month={month} />
      </TabsContent>

      <TabsContent value="types">
        <IncidentTypesSection siteId={siteId} month={monthString} />
      </TabsContent>
    </Tabs>
  );
}