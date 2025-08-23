import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { format } from "date-fns";

interface ExecutiveSummaryProps {
  siteName: string;
  month: string;
  executiveSummary: string;
}

export const ExecutiveSummarySection = ({ siteName, month, executiveSummary }: ExecutiveSummaryProps) => {
  const formattedMonth = format(new Date(month), "MMMM yyyy");
  
  return (
    <Card>
      <CardHeader>
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Monthly Safety Report</h1>
          <div className="text-xl">{siteName}</div>
          <div className="text-lg text-muted-foreground">{formattedMonth}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose max-w-none">
          <h2 className="text-xl font-semibold mb-4">Executive Summary</h2>
          <p className="text-muted-foreground">{executiveSummary}</p>
        </div>
      </CardContent>
    </Card>
  );
};