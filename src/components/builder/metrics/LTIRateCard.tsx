import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface LTIRateCardProps {
  ltiRate: number | null;
  baselineLti: number | null;
  month: string;
}

export const LTIRateCard = ({ ltiRate, baselineLti, month }: LTIRateCardProps) => {
  const numericRate = ltiRate !== null ? Number(ltiRate) : NaN;
  const formattedRate = !isNaN(numericRate) ? numericRate.toFixed(2) : 'N/A';
  const formattedMonth = format(new Date(`${month}-01`), 'MMMM yyyy');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-left">LTI Rate ({formattedMonth})</CardTitle>
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className={`text-2xl font-bold ${numericRate > 12 ? 'text-red-500' : ''}`}>
            {formattedRate}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-sm">per million hours</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Target: {baselineLti || 'N/A'}
        </p>
        {numericRate > 12 && (
          <p className="text-xs text-red-500 mt-1">
            Rate exceeds typical range (0-12)
          </p>
        )}
      </CardContent>
    </Card>
  );
};