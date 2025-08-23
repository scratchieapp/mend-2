import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';

export function ImportForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Data</CardTitle>
        <CardDescription>
          Upload CSV or Excel files to import data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">Select File</Label>
          <Input 
            id="file" 
            type="file" 
            accept=".csv,.xlsx,.xls"
            className="cursor-pointer"
          />
        </div>
        <Button className="w-full">
          <Upload className="mr-2 h-4 w-4" />
          Upload and Import
        </Button>
      </CardContent>
    </Card>
  );
}