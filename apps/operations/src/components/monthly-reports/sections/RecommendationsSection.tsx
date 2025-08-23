import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RecommendationsProps {
  recommendations: string[];
}

export const RecommendationsSection = ({ recommendations }: RecommendationsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-6 space-y-2">
          {recommendations.map((recommendation, index) => (
            <li key={index} className="text-muted-foreground">{recommendation}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};