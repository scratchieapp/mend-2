import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SiteOverviewCardProps {
  siteName: string;
  city: string;
  state: string;
  currentStatus: string;
  incidentCount: number;
  totalHours: number;
  ltiRate: number;
  siteRanking: {
    ltiRank: number;
    totalSites: number;
  };
  onHoursClick: () => void;
}

export const SiteOverviewCard = ({
  siteName,
  city,
  state,
  currentStatus,
  incidentCount,
  totalHours,
  ltiRate,
  siteRanking,
  onHoursClick,
}: SiteOverviewCardProps) => {
  const getRankingIcon = (rank: number, total: number) => {
    if (rank === 1) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (rank === total) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{siteName}</span>
          <div className="flex items-center gap-2 text-sm font-normal">
            {getRankingIcon(siteRanking.ltiRank, siteRanking.totalSites)}
            <span>
              Rank {siteRanking.ltiRank} of {siteRanking.totalSites} sites
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Location</p>
            <p>{city}, {state}</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="capitalize">{currentStatus}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-secondary rounded-lg">
              <div className="text-2xl font-bold">{incidentCount}</div>
              <div className="text-sm text-muted-foreground">Total Incidents</div>
            </div>
            
            <div 
              className={`p-4 bg-secondary rounded-lg ${currentStatus === 'working' ? 'cursor-pointer hover:bg-secondary/80' : ''} transition-colors`}
              onClick={() => currentStatus === 'working' && onHoursClick()}
            >
              <div className="text-2xl font-bold">{totalHours.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Hours Worked</div>
            </div>
            
            <div className="p-4 bg-secondary rounded-lg">
              <div className="text-2xl font-bold">
                {totalHours > 0 ? ltiRate.toFixed(2) : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">LTI Rate</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};