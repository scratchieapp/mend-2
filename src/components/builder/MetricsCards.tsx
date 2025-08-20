import { Skeleton } from "@/components/ui/skeleton";
import { useEmployerData } from "@/hooks/useEmployerData";
import { LTIRateCard } from "./metrics/LTIRateCard";
import { InsurancePremiumCard } from "./metrics/InsurancePremiumCard";
import { OpenClaimsCard } from "./metrics/OpenClaimsCard";
import { AverageDaysLostCard } from "./metrics/AverageDaysLostCard";

interface MetricsCardsProps {
  selectedEmployerId: number | null;
  selectedMonth: string;
}

export const MetricsCards = ({ selectedEmployerId, selectedMonth }: MetricsCardsProps) => {
  const { kpiData, isLoadingKPIs } = useEmployerData(selectedEmployerId, selectedMonth);

  if (isLoadingKPIs) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[160px] w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <LTIRateCard 
        ltiRate={kpiData?.lti_rate?.toFixed(2) || 'N/A'} 
        baselineLti={kpiData?.baseline_lti || 'N/A'} 
        month={selectedMonth}
      />
      <InsurancePremiumCard 
        baselineInsurance={kpiData?.baseline_comp_insurance || 'N/A'} 
      />
      <OpenClaimsCard selectedMonth={selectedMonth} />
      <AverageDaysLostCard selectedMonth={selectedMonth} />
    </div>
  );
};