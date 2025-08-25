import { Skeleton } from "@/components/ui/skeleton";
import { useEmployerData } from "@/hooks/useEmployerData";
import { LTIRateCard } from "./metrics/LTIRateCard";
import { InsurancePremiumCard } from "./metrics/InsurancePremiumCard";
import { OpenClaimsCard } from "./metrics/OpenClaimsCard";
import { AverageDaysLostCard } from "./metrics/AverageDaysLostCard";
import { PsychosocialFlagsCard } from "./metrics/PsychosocialFlagsCard";

interface MetricsCardsProps {
  selectedEmployerId: number | null;
  selectedMonth: string;
}

export const MetricsCards = ({ selectedEmployerId, selectedMonth }: MetricsCardsProps) => {
  const { kpiData, isLoadingKPIs } = useEmployerData(selectedEmployerId, selectedMonth);

  if (isLoadingKPIs) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[160px] w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-[160px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PsychosocialFlagsCard selectedMonth={selectedMonth} />
      </div>
    </div>
  );
};