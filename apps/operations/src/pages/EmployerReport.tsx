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
  Building2,
  FileText,
  Loader2,
  Users,
  MapPin
} from "lucide-react";
import { FrequencyRateCard } from "@/components/reports/FrequencyRateCard";
import { IncidentBreakdownChart } from "@/components/reports/IncidentBreakdownChart";
import { DataQualityBanner } from "@/components/reports/DataQualityBanner";
import { RecommendationsList } from "@/components/reports/RecommendationsList";
import { JurisdictionalComparison } from "@/components/reports/JurisdictionalComparison";
import { downloadReportPDF } from "@/components/reports/ReportPDFDocument";
import type { GeneratedReport } from "@/types/reports";

interface Employer {
  employer_id: number;
  employer_name: string;
}

const EmployerReport = () => {
  const { employerId } = useParams<{ employerId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const month = searchParams.get('month') || format(new Date(), 'yyyy-MM');
  const formattedMonth = format(new Date(month + '-01'), 'MMMM yyyy');

  const [employer, setEmployer] = useState<Employer | null>(null);
  const [siteCount, setSiteCount] = useState<number>(0);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch employer details and site count
  useEffect(() => {
    const fetchEmployerData = async () => {
      if (!employerId) return;
      
      // Fetch employer
      const { data: employerData, error: employerError } = await supabase
        .from('employers')
        .select('employer_id, employer_name')
        .eq('employer_id', parseInt(employerId))
        .single();

      if (employerError) {
        console.error('Error fetching employer:', employerError);
        toast({
          title: "Error",
          description: "Failed to load employer details",
          variant: "destructive",
        });
        return;
      }

      setEmployer(employerData as Employer);

      // Fetch site count
      const { count } = await supabase
        .from('sites')
        .select('site_id', { count: 'exact', head: true })
        .eq('employer_id', parseInt(employerId));

      setSiteCount(count || 0);
    };

    fetchEmployerData();
  }, [employerId, toast]);

  // Fetch or generate report
  useEffect(() => {
    const fetchOrGenerateReport = async () => {
      if (!employerId || !employer) return;

      setIsLoading(true);

      // Check for existing report
      const { data: existingReport } = await supabase
        .from('generated_reports')
        .select('report_data, executive_summary, ai_recommendations, last_summary_generated')
        .eq('employer_id', parseInt(employerId))
        .eq('report_month', `${month}-01`)
        .is('site_id', null) // Employer-level report has no site_id
        .maybeSingle();

      if (existingReport?.report_data) {
        setReport(existingReport.report_data as unknown as GeneratedReport);
        setIsLoading(false);
        return;
      }

      // Generate new report
      await generateReport();
    };

    if (employer) {
      fetchOrGenerateReport();
    }
  }, [employerId, month, employer]);

  const generateReport = async () => {
    if (!employerId) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-safety-report', {
        body: {
          employerId: parseInt(employerId),
          month,
          reportType: 'employer',
        },
      });

      if (error) throw error;

      setReport(data as GeneratedReport);
      toast({
        title: "Report Generated",
        description: "Your company safety report has been generated successfully.",
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
    if (!report || !employer) return;
    
    setIsDownloading(true);
    try {
      await downloadReportPDF(
        report,
        undefined,
        employer.employer_name,
        month,
        'employer'
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

  if (!employer && !isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Company not found</p>
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
            <h1 className="text-2xl font-bold">Company Safety Report</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>{employer?.employer_name || 'Loading...'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{siteCount} site{siteCount !== 1 ? 's' : ''}</span>
              </div>
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
          <Skeleton className="h-[400px]" />
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
              description="Aggregated across all sites"
            />
            <FrequencyRateCard
              title="Total Recordable Injury Frequency Rate"
              rate={report.metrics.trifr}
              previousRate={report.comparison.previousMonth?.trifr}
              variant="trifr"
              description="LTI + MTI per million hours"
            />
            <FrequencyRateCard
              title="Medical Treatment Injury Frequency Rate"
              rate={report.metrics.mtifr}
              variant="mtifr"
              description="MTIs per million hours"
            />
          </div>

          {/* Company-Wide Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Company-Wide Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-6">
                <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg text-center">
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {report.metrics.lti}
                  </p>
                  <p className="text-xs text-muted-foreground">Lost Time Injuries</p>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-center">
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                    {report.metrics.mti}
                  </p>
                  <p className="text-xs text-muted-foreground">Medical Treatment</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {report.metrics.fai}
                  </p>
                  <p className="text-xs text-muted-foreground">First Aid</p>
                </div>
                <div className="p-4 bg-secondary rounded-lg text-center">
                  <p className="text-3xl font-bold">
                    {report.metrics.totalIncidents}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Incidents</p>
                </div>
                <div className="p-4 bg-secondary rounded-lg text-center">
                  <p className="text-3xl font-bold">
                    {(report.metrics.totalHours / 1000).toFixed(0)}k
                  </p>
                  <p className="text-xs text-muted-foreground">Total Hours</p>
                </div>
                <div className="p-4 bg-secondary rounded-lg text-center">
                  <p className="text-3xl font-bold">
                    {Math.round((report.metrics.subcontractorHours / report.metrics.totalHours) * 100) || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Subcontractor</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Jurisdictional Comparison */}
          {report.incidentBreakdown.byState && report.incidentBreakdown.byState.length > 0 && (
            <JurisdictionalComparison 
              data={report.incidentBreakdown.byState}
              totalHours={report.metrics.totalHours}
            />
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

          {/* Employee vs Subcontractor Breakdown */}
          {report.metrics.subcontractorHours > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Workforce Hours Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Employee Hours</span>
                      <span className="text-sm font-medium">
                        {Math.round((report.metrics.employeeHours / report.metrics.totalHours) * 100)}%
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {report.metrics.employeeHours.toLocaleString()}
                    </p>
                    <div className="mt-2 h-2 bg-emerald-200 dark:bg-emerald-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(report.metrics.employeeHours / report.metrics.totalHours) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Subcontractor Hours</span>
                      <span className="text-sm font-medium">
                        {Math.round((report.metrics.subcontractorHours / report.metrics.totalHours) * 100)}%
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {report.metrics.subcontractorHours.toLocaleString()}
                    </p>
                    <div className="mt-2 h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(report.metrics.subcontractorHours / report.metrics.totalHours) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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

export default EmployerReport;

