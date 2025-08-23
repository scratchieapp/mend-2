import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export function ImportGuidelines() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Guidelines</CardTitle>
        <CardDescription>
          Follow these guidelines for successful data import
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>File Format Requirements:</strong>
            <ul className="list-disc list-inside mt-2">
              <li>CSV files must be UTF-8 encoded</li>
              <li>First row must contain column headers</li>
              <li>Date format: YYYY-MM-DD</li>
              <li>Time format: HH:MM:SS (24-hour)</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <h3 className="font-semibold">Supported Data Types:</h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Workers and Employment Data</li>
            <li>Incident Reports</li>
            <li>Medical Professional Records</li>
            <li>Employer Information</li>
            <li>Reference Tables (codes, classifications)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}