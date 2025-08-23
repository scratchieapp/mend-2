import { TrendingUp } from "lucide-react";
import { IndustryLTIData } from "@/hooks/useIndustryLTIData";

interface IndustryLTICardContentProps {
  data: IndustryLTIData;
}

export const IndustryLTICardContent = ({ data }: IndustryLTICardContentProps) => {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold">{data.average}</div>
        <div className="flex items-center text-muted-foreground">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span className="text-sm">per million hours</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Based on data from {data.employers} employers for {data.month}
      </p>
    </div>
  );
};