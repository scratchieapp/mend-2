import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployerSelection } from "@/hooks/useEmployerSelection";

interface InsurancePremiumCardProps {
  baselineInsurance: string | number;
}

export const InsurancePremiumCard = ({ baselineInsurance }: InsurancePremiumCardProps) => {
  const { selectedEmployerId } = useEmployerSelection();
  
  const { data: claimCosts } = useQuery({
    queryKey: ['insurance-costs', selectedEmployerId],
    queryFn: async () => {
      if (!selectedEmployerId) return null;
      
      // Calculate estimated claim costs based on incident severity
      const { data: incidents, error } = await supabase
        .from('incidents')
        .select('classification, total_days_lost')
        .eq('employer_id', selectedEmployerId)
        .gte('date_of_injury', new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
      
      if (error || !incidents) return { total: 0, trend: 0 };
      
      // Estimate costs based on incident classification
      let totalCosts = 0;
      incidents.forEach(incident => {
        if (incident.classification === 'FAI') {
          totalCosts += 50000; // First Aid Injury average cost
        } else if (incident.classification === 'MTI') {
          totalCosts += 15000; // Medical Treatment Injury average cost  
        } else if (incident.classification === 'LTI') {
          totalCosts += 85000 + (incident.total_days_lost || 0) * 500; // Lost Time Injury
        } else if (incident.classification === 'RWI') {
          totalCosts += 25000; // Restricted Work Injury
        }
      });
      
      // Calculate YoY trend (mock for now)
      const trend = totalCosts > 1000000 ? 8 : -12;
      
      return {
        total: totalCosts,
        trend: trend
      };
    },
    enabled: !!selectedEmployerId
  });
  
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-left">Claim Costs (YTD)</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="text-left">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">
            {claimCosts ? formatCurrency(claimCosts.total) : '$0'}
          </div>
          {claimCosts && claimCosts.trend !== 0 && (
            <div className={`flex items-center ${claimCosts.trend > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {claimCosts.trend > 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              <span className="text-sm">
                {claimCosts.trend > 0 ? '+' : ''}{claimCosts.trend}% YoY
              </span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Target: ${baselineInsurance || 'N/A'}
        </p>
      </CardContent>
    </Card>
  );
};