import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const LoadingTableState = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Employers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center p-4">
          Loading employers...
        </div>
      </CardContent>
    </Card>
  );
};