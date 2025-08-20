import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown } from "lucide-react";

interface InsurancePremiumCardProps {
  baselineInsurance: string | number;
}

export const InsurancePremiumCard = ({ baselineInsurance }: InsurancePremiumCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-left">Insurance Premium</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="text-left">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">$1.2M</div>
          <div className="flex items-center text-green-500">
            <TrendingDown className="h-4 w-4 mr-1" />
            <span className="text-sm">-8% YoY</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Target: ${baselineInsurance || 'N/A'}
        </p>
      </CardContent>
    </Card>
  );
};