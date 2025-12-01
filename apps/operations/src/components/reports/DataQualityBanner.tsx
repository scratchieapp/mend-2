import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Info, CheckCircle } from "lucide-react";
import { DataQuality } from "@/types/reports";

interface DataQualityBannerProps {
  dataQuality: DataQuality;
}

export const DataQualityBanner = ({ dataQuality }: DataQualityBannerProps) => {
  const { hasEstimatedHours, dataSources, totalSites, sitesWithHours } = dataQuality;
  const coveragePercent = totalSites > 0 ? Math.round((sitesWithHours / totalSites) * 100) : 0;
  const hasGoodCoverage = coveragePercent >= 80;
  const hasCompleteCoverage = coveragePercent === 100;

  if (hasCompleteCoverage && !hasEstimatedHours) {
    return (
      <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <AlertTitle className="text-emerald-800 dark:text-emerald-200">High Quality Data</AlertTitle>
        <AlertDescription className="text-emerald-700 dark:text-emerald-300">
          All {totalSites} sites have verified hours data. Frequency rates are calculated with high confidence.
          {dataSources.length > 1 && (
            <span className="block mt-1 text-xs">
              Data sources: {dataSources.join(', ')}
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (hasEstimatedHours || !hasGoodCoverage) {
    return (
      <Alert variant="destructive" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">Data Quality Notice</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          <ul className="list-disc list-inside space-y-1 mt-1">
            {hasEstimatedHours && (
              <li>Some hours data is estimated. Frequency rates may be approximate.</li>
            )}
            {!hasGoodCoverage && (
              <li>
                Only {sitesWithHours} of {totalSites} sites ({coveragePercent}%) have hours data for this period.
              </li>
            )}
          </ul>
          <p className="mt-2 text-xs">
            For more accurate reporting, ensure all sites have verified hours entered.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-800 dark:text-blue-200">Data Coverage</AlertTitle>
      <AlertDescription className="text-blue-700 dark:text-blue-300">
        {sitesWithHours} of {totalSites} sites ({coveragePercent}%) have hours data.
        {dataSources.length > 0 && (
          <span className="block mt-1 text-xs">
            Data sources: {dataSources.join(', ')}
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
};

