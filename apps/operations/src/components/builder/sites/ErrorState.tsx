import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ErrorState = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sites</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground">
          Error loading sites
        </div>
      </CardContent>
    </Card>
  );
};