import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorTableStateProps {
  error?: Error | null;
}

export const ErrorTableState = ({ error }: ErrorTableStateProps = {}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Employers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-red-500 p-4">
          <p>Error loading employers. Please try again later.</p>
          {error && (
            <pre className="mt-2 text-sm bg-red-50 p-2 rounded overflow-auto">
              {error.message}
            </pre>
          )}
        </div>
      </CardContent>
    </Card>
  );
};