import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ReportGenerator } from "@/components/monthly-reports/ReportGenerator";
import { ReportView } from "@/components/monthly-reports/ReportView";

interface Site {
  site_id: number;
  site_name: string;
}

const MonthlyReportsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [selectedSiteName, setSelectedSiteName] = useState<string>("");

  // Get last 12 months for the dropdown
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
    };
  });

  const { data: sites = [], isLoading: isLoadingSites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('site_id, site_name')
        .order('site_name');
      
      if (error) throw error;
      return data as Site[];
    },
  });

  // Check if hours are logged for the selected month and site
  const { data: hoursData, isLoading: isCheckingHours } = useQuery({
    queryKey: ['hours', selectedSite, selectedMonth],
    queryFn: async () => {
      if (!selectedSite || !selectedMonth) return null;
      
      const { data, error } = await supabase
        .from('hours_worked')
        .select('*')
        .eq('site_id', selectedSite)
        .eq('month', `${selectedMonth}-01`)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSite && !!selectedMonth,
  });

  const handleGenerateReport = async () => {
    if (!hoursData) {
      toast({
        title: "Hours data missing",
        description: "Please input hours worked for this month before generating the report.",
        action: (
          <Button 
            variant="outline" 
            onClick={() => navigate(`/hours-management?site=${selectedSite}&month=${selectedMonth}`)}
          >
            Add Hours
          </Button>
        ),
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Fake report data for now
      const reportData = {
        executiveSummary: `During ${format(new Date(selectedMonth), "MMMM yyyy")}, there were 3 recordable incidents, representing a 25% decrease from the previous month. The LTIFR has improved to 2.5, below the industry benchmark of 3.0. Key areas of focus remain manual handling and workplace communication.`,
        metrics: {
          firstAid: 5,
          mti: 2,
          lti: 1,
          ltifr: 2.5,
          trifr: 4.8,
          mtifr: 3.2
        },
        incidentTypes: [
          { type: "Strain/Sprain", count: 3 },
          { type: "Cut/Laceration", count: 2 },
          { type: "Bruise/Contusion", count: 1 }
        ],
        recommendations: [
          "Implement enhanced manual handling training program",
          "Review and update workplace communication protocols",
          "Conduct targeted safety audits in high-risk areas"
        ]
      };

      const { error } = await supabase
        .from('generated_reports')
        .insert({
          site_id: parseInt(selectedSite),
          report_month: `${selectedMonth}-01`,
          report_data: reportData,
          executive_summary: reportData.executiveSummary,
          ai_recommendations: reportData.recommendations.join('\n')
        });

      if (error) throw error;

      setGeneratedReport(reportData);
      const site = sites.find(s => s.site_id.toString() === selectedSite);
      setSelectedSiteName(site?.site_name || "");

      toast({
        title: "Report Generated",
        description: "Your monthly report has been generated successfully.",
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoadingSites) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/builder/senior')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Monthly Reports</h1>
      </div>

      <ReportGenerator
        sites={sites}
        selectedSite={selectedSite}
        selectedMonth={selectedMonth}
        months={months}
        isGenerating={isGenerating}
        isCheckingHours={isCheckingHours}
        onSiteChange={setSelectedSite}
        onMonthChange={setSelectedMonth}
        onGenerate={handleGenerateReport}
      />

      {generatedReport && (
        <ReportView
          reportData={generatedReport}
          siteName={selectedSiteName}
          month={selectedMonth}
          siteId={parseInt(selectedSite)}
        />
      )}
    </div>
  );
};

export default MonthlyReportsPage;