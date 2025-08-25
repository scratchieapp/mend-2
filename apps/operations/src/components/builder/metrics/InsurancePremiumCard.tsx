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
      
      // Get configured cost settings
      const savedCosts = localStorage.getItem('incident_cost_settings');
      const costSettings = savedCosts ? JSON.parse(savedCosts) : {
        fai_cost: 50000,
        mti_cost: 15000,
        lti_base_cost: 85000,
        lti_daily_cost: 500,
        rwi_cost: 25000,
        fatality_cost: 5000000
      };
      
      // Calculate estimated claim costs based on incident severity
      const { data: incidents, error } = await supabase
        .from('incidents')
        .select('classification, total_days_lost, fatality')
        .eq('employer_id', selectedEmployerId)
        .gte('date_of_injury', new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
      
      if (error || !incidents) return { total: 0, trend: 0 };
      
      // Estimate costs based on incident classification
      let totalCosts = 0;
      incidents.forEach(incident => {
        if (incident.fatality) {
          totalCosts += costSettings.fatality_cost;
        } else if (incident.classification === 'FAI') {
          totalCosts += costSettings.fai_cost;
        } else if (incident.classification === 'MTI') {
          totalCosts += costSettings.mti_cost;
        } else if (incident.classification === 'LTI') {
          totalCosts += costSettings.lti_base_cost + (incident.total_days_lost || 0) * costSettings.lti_daily_cost;
        } else if (incident.classification === 'RWI') {
          totalCosts += costSettings.rwi_cost;
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