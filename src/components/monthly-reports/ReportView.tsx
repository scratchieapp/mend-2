import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { usePDF } from "react-to-pdf";
import { useToast } from "@/hooks/use-toast";
import { TimeSeriesFrequencyRates } from "./TimeSeriesFrequencyRates";
import { ExecutiveSummarySection } from "./sections/ExecutiveSummarySection";
import { KeyMetricsSection } from "./sections/KeyMetricsSection";
import { IncidentTypesSection } from "./sections/IncidentTypesSection";
import { RecommendationsSection } from "./sections/RecommendationsSection";
import { format } from "date-fns";
import type { IncidentType } from "@/types/incidents";

interface ReportViewProps {
  reportData: {
    executiveSummary: string;
    metrics: {
      firstAid: number;
      mti: number;
      lti: number;
      ltifr: number;
      trifr: number;
      mtifr: number;
    };
    incidentTypes: IncidentType[];
    recommendations: string[];
  };
  siteName: string;
  month: string;
  siteId: number;
}

export function ReportView({ reportData, siteName, month, siteId }: ReportViewProps) {
  const formattedMonth = format(new Date(month), "MMMM yyyy");
  const { toast } = useToast();
  const { toPDF, targetRef } = usePDF({
    filename: `${siteName}-Safety-Report-${formattedMonth}.pdf`,
    page: { 
      margin: 20,
      format: 'a4'
    }
  });

  const handleDownloadPDF = async () => {
    try {
      await toPDF();
      toast({
        title: "PDF Generated",
        description: "Your report has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="space-y-6 pb-8">
      <div className="flex justify-end mb-4">
        <Button onClick={handleDownloadPDF}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>

      <div ref={targetRef} className="space-y-8 p-4 bg-white">
        <div className="page-break-inside-avoid">
          <ExecutiveSummarySection 
            siteName={siteName}
            month={month}
            executiveSummary={reportData.executiveSummary}
          />
        </div>

        <div className="page-break-inside-avoid">
          <KeyMetricsSection metrics={reportData.metrics} />
        </div>

        <div className="page-break-inside-avoid">
          <TimeSeriesFrequencyRates siteId={siteId} month={month} />
        </div>

        <div className="page-break-inside-avoid">
          <IncidentTypesSection siteId={siteId} month={month} />
        </div>

        <div className="page-break-inside-avoid">
          <RecommendationsSection recommendations={reportData.recommendations} />
        </div>
      </div>
    </div>
  );
}