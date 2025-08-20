import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ReportGeneratorProps {
  sites: Array<{ site_id: number; site_name: string }>;
  selectedSite: string;
  selectedMonth: string;
  months: Array<{ value: string; label: string }>;
  isGenerating: boolean;
  isCheckingHours: boolean;
  onSiteChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onGenerate: () => void;
}

export function ReportGenerator({
  sites,
  selectedSite,
  selectedMonth,
  months,
  isGenerating,
  isCheckingHours,
  onSiteChange,
  onMonthChange,
  onGenerate,
}: ReportGeneratorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Monthly Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Site</label>
            <Select
              value={selectedSite}
              onValueChange={onSiteChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.site_id} value={site.site_id.toString()}>
                    {site.site_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Month</label>
            <Select
              value={selectedMonth}
              onValueChange={onMonthChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={onGenerate}
          disabled={!selectedSite || !selectedMonth || isGenerating || isCheckingHours}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}