import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export const ErrorState = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Safety Performance Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-destructive">Failed to load safety summary</p>
      </CardContent>
    </Card>
  );
};