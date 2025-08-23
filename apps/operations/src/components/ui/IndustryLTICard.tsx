import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useIndustryLTIData } from "@/hooks/useIndustryLTIData";
import { IndustryLTICardContent } from "./IndustryLTICardContent";

export const IndustryLTICard = () => {
  const { data: industryLTI, isLoading } = useIndustryLTIData();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Industry Average LTI Rate</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-6 w-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Industry Average LTI Rate</CardTitle>
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {industryLTI && <IndustryLTICardContent data={industryLTI} />}
      </CardContent>
    </Card>
  );
};