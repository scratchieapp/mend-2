import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  ChevronLeft, 
  Download, 
  RefreshCw, 
  Calendar, 
  MapPin,
  FileText,
  Loader2
} from "lucide-react";
import { FrequencyRateCard } from "@/components/reports/FrequencyRateCard";
import { IncidentBreakdownChart } from "@/components/reports/IncidentBreakdownChart";
import { DataQualityBanner } from "@/components/reports/DataQualityBanner";
import { RecommendationsList } from "@/components/reports/RecommendationsList";
import { TimeSeriesFrequencyRates } from "@/components/monthly-reports/TimeSeriesFrequencyRates";
import { downloadReportPDF } from "@/components/reports/ReportPDFDocument";
import type { GeneratedReport } from "@/types/reports";

interface Site {
  site_id: number;
  site_name: string;
  state: string | null;
  employer_id: number;
  employers?: {
    employer_name: string;
  };
}

const SiteReport = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const month = searchParams.get('month') || format(new Date(), 'yyyy-MM');
  const formattedMonth = format(new Date(month + '-01'), 'MMMM yyyy');

  const [site, setSite] = useState<Site | null>(null);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch site details
  useEffect(() => {
    const fetchSite = async () => {
      if (!siteId) return;
      
      const { data, error } = await supabase
        .from('sites')
        .select(`
          site_id,
          site_name,
          state,
          employer_id,
          employers (employer_name)
        `)
        .eq('site_id', parseInt(siteId))
        .single();

      if (error) {
        console.error('Error fetching site:', error);
        toast({
          title: "Error",
          description: "Failed to load site details",
          variant: "destructive",
        });
        return;
      }

      setSite(data as Site);
    };

    fetchSite();
  }, [siteId, toast]);

  // Fetch or generate report
  useEffect(() => {
    const fetchOrGenerateReport = async () => {
      if (!siteId || !site) return;

      setIsLoading(true);

      // First, check for existing report
      const { data: existingReport } = await supabase
        .from('generated_reports')
        .select('report_data, executive_summary, ai_recommendations, last_summary_generated')
        .eq('site_id', parseInt(siteId))
        .eq('report_month', `${month}-01`)
        .maybeSingle();

      if (existingReport?.report_data) {
        setReport(existingReport.report_data as unknown as GeneratedReport);
        setIsLoading(false);
        return;
      }

      // Generate new report
      await generateReport();
    };

    if (site) {
      fetchOrGenerateReport();
    }
  }, [siteId, month, site]);

  const generateReport = async () => {
    if (!siteId || !site) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-safety-report', {
        body: {
          siteId: parseInt(siteId),
          employerId: site.employer_id,
          month,
          reportType: 'site',
        },
      });

      if (error) throw error;

      setReport(data as GeneratedReport);
      toast({
        title: "Report Generated",
        description: "Your safety report has been generated successfully.",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    generateReport();
  };

  const handleDownloadPDF = async () => {
    if (!report || !site) return;
    
    setIsDownloading(true);
    try {
      await downloadReportPDF(
        report,
        site.site_name,
        site.employers?.employer_name,
        month,
        'site'
      );
      toast({
        title: "PDF Downloaded",
        description: "Your report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Error",
        description: "Failed to download PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!site && !isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Site not found</p>
            <Button variant="link" onClick={() => navigate('/reports')}>
              Return to Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Site Safety Report</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{site?.site_name || 'Loading...'}</span>
              {site?.state && <span className="text-xs">({site.state})</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isGenerating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
          <Button 
            disabled={!report || isDownloading}
            onClick={handleDownloadPDF}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {/* Report Period */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Report Period:</span>
            <span>{formattedMonth}</span>
          </div>
        </CardContent>
      </Card>

      {isLoading || isGenerating ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-[180px]" />
            <Skeleton className="h-[180px]" />
            <Skeleton className="h-[180px]" />
          </div>
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[300px]" />
        </div>
      ) : report ? (
        <>
          {/* Data Quality Banner */}
          <DataQualityBanner dataQuality={report.dataQuality} />

          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {report.executiveSummary}
              </p>
            </CardContent>
          </Card>

          {/* Frequency Rate Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <FrequencyRateCard
              title="Lost Time Injury Frequency Rate"
              rate={report.metrics.ltifr}
              previousRate={report.comparison.previousMonth?.ltifr}
              variant="ltifr"
              description="Number of LTIs per million hours worked"
            />
            <FrequencyRateCard
              title="Total Recordable Injury Frequency Rate"
              rate={report.metrics.trifr}
              previousRate={report.comparison.previousMonth?.trifr}
              variant="trifr"
              description="Total recordable incidents per million hours"
            />
            <FrequencyRateCard
              title="Medical Treatment Injury Frequency Rate"
              rate={report.metrics.mtifr}
              variant="mtifr"
              description="MTIs per million hours worked"
            />
          </div>

          {/* Incident Counts */}
          <Card>
            <CardHeader>
              <CardTitle>Incident Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg text-center">
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {report.metrics.lti}
                  </p>
                  <p className="text-sm text-muted-foreground">Lost Time Injuries</p>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-center">
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                    {report.metrics.mti}
                  </p>
                  <p className="text-sm text-muted-foreground">Medical Treatment</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {report.metrics.fai}
                  </p>
                  <p className="text-sm text-muted-foreground">First Aid</p>
                </div>
                <div className="p-4 bg-secondary rounded-lg text-center">
                  <p className="text-3xl font-bold">
                    {report.metrics.totalHours.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                </div>
                <div className="p-4 bg-secondary rounded-lg text-center">
                  <p className="text-3xl font-bold">
                    {report.metrics.totalIncidents}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Incidents</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Frequency Rates Trend */}
          {siteId && (
            <TimeSeriesFrequencyRates siteId={parseInt(siteId)} month={month} />
          )}

          {/* Incident Breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            <IncidentBreakdownChart
              title="Incidents by Type"
              data={report.incidentBreakdown.byType.map(t => ({ name: t.type, count: t.count }))}
              type="bar"
            />
            <IncidentBreakdownChart
              title="Incidents by Mechanism"
              data={report.incidentBreakdown.byMechanism.map(m => ({ name: m.mechanism, count: m.count }))}
              type="pie"
            />
          </div>

          {/* Recommendations */}
          <RecommendationsList recommendations={report.recommendations} />

          {/* Report Metadata */}
          <div className="text-xs text-muted-foreground text-center py-4">
            Report generated: {format(new Date(report.generatedAt), 'PPpp')}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Generating report...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SiteReport;

