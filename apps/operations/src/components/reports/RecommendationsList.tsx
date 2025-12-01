import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, CheckCircle2 } from "lucide-react";

interface RecommendationsListProps {
  recommendations: string[];
}

export const RecommendationsList = ({ recommendations }: RecommendationsListProps) => {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          AI-Generated Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {recommendations.map((recommendation, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">{index + 1}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {recommendation}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

