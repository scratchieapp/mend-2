import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { format, startOfMonth, subMonths, parseISO } from "date-fns";
import { toast } from "sonner";
import { useSiteDetails } from "./safety-summary/useSiteDetails";
import { useHoursUpdate } from "./safety-summary/useHoursUpdate";
import { UpdateSiteDialog } from "./safety-summary/UpdateSiteDialog";
import { LoadingState } from "./safety-summary/LoadingState";
import { ErrorState } from "./safety-summary/ErrorState";
import { SiteHeader } from "./safety-summary/SiteHeader";
import { SiteOverviewCard } from "./safety-summary/SiteOverviewCard";
import { SafetyMetricsTabs } from "./safety-summary/SafetyMetricsTabs";

interface SiteSafetySummaryProps {
  siteId: number;
}

export const SiteSafetySummary = ({ siteId }: SiteSafetySummaryProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const defaultMonth = startOfMonth(subMonths(new Date(), 1)).toISOString();
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  
  const { data, isLoading, error } = useSiteDetails(siteId, selectedMonth);
  const hoursUpdateMutation = useHoursUpdate();

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i + 1);
    return {
      value: startOfMonth(date).toISOString(),
      label: format(date, 'MMMM yyyy')
    };
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState />;
  if (!data) return null;

  const handleUpdateHours = (employerHours: number, subcontractorHours: number) => {
    if (!data.employerId) {
      toast.error("Employer ID is missing. Cannot update hours.");
      return;
    }

    hoursUpdateMutation.mutate({
      siteId,
      employerId: data.employerId,
      month: selectedMonth,
      employerHours,
      subcontractorHours,
      currentStatus: data.currentStatus
    });
    setIsDialogOpen(false);
  };

  const handleUpdateStatus = (status: string) => {
    console.log('Status updated:', status);
  };

  return (
    <div className="space-y-6">
      <SiteHeader 
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        monthOptions={monthOptions}
      />

      {data.significantChange && (
        <Alert variant={data.significantChange.type}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Significant Safety Metric Change</AlertTitle>
          <AlertDescription>{data.significantChange.message}</AlertDescription>
        </Alert>
      )}

      <SiteOverviewCard
        siteName={data.siteName}
        city={data.city}
        state={data.state}
        currentStatus={data.currentStatus}
        incidentCount={data.incidentCount}
        totalHours={data.totalHours}
        ltiRate={data.ltiRate}
        siteRanking={data.siteRanking}
        onHoursClick={() => setIsDialogOpen(true)}
      />

      <SafetyMetricsTabs
        siteId={siteId}
        month={parseISO(selectedMonth)}
      />

      <UpdateSiteDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        data={{
          projectType: data.projectType,
          employerHours: data.employerHours,
          subcontractorHours: data.subcontractorHours,
          currentStatus: data.currentStatus
        }}
        onUpdateStatus={handleUpdateStatus}
        onUpdateHours={handleUpdateHours}
      />
    </div>
  );
};