import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp } from "lucide-react";
import { useIndustryLTIData } from "@/hooks/useIndustryLTIData";
import { IndustryLTICardContent } from "./IndustryLTICardContent";
import { Badge } from "@/components/ui/badge";

export const IndustryLTICard = () => {
  const { data: industryLTI, isLoading } = useIndustryLTIData();

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-200 flex flex-col h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Industry Average LTI Rate</CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col flex-1">
          {/* Loading state with same structure */}
          <div className="h-[72px] flex flex-col justify-center">
            <div className="animate-pulse h-9 w-24 bg-muted rounded" />
          </div>
          <div className="pt-3 mt-auto border-t border-muted/30">
            <div className="animate-pulse h-4 w-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-200 flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Industry Average LTI Rate</CardTitle>
          <div className="p-2 bg-blue-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-blue-600" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col flex-1">
        {industryLTI && (
          <>
            {/* Standardized metric display area - fixed height */}
            <div className="h-[72px] flex flex-col justify-center">
              <div className="text-3xl font-bold text-foreground leading-none">{industryLTI.average}</div>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5">
                  per million hours
                </Badge>
              </div>
            </div>
            
            {/* Standardized bottom content area */}
            <div className="pt-3 mt-auto border-t border-muted/30">
              <p className="text-xs text-muted-foreground">
                Based on data from <span className="font-medium">{industryLTI.employers}</span> employers for <span className="font-medium">{industryLTI.month}</span>
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

};