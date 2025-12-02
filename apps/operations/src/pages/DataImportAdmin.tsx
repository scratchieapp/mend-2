import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileUp, FileSpreadsheet, Database, Construction, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DataImportAdmin() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link to="/admin" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Link>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <FileUp className="h-8 w-8" />
          Data Import
        </h1>
        <p className="text-muted-foreground">Import data from external systems</p>
      </div>

      <Alert className="mb-6">
        <Construction className="h-4 w-4" />
        <AlertTitle>Coming Soon</AlertTitle>
        <AlertDescription>
          Data import functionality is being developed. Currently, data can be imported directly via the Supabase dashboard.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Workers Import
            </CardTitle>
            <CardDescription>
              Import worker records from CSV/Excel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Incidents Import
            </CardTitle>
            <CardDescription>
              Import historical incident records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Hours Data Import
            </CardTitle>
            <CardDescription>
              Import hours worked from Procore/HammerTech
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Import Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Supported Formats</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>CSV (Comma Separated Values)</li>
                <li>Excel (.xlsx, .xls)</li>
                <li>JSON (for API imports)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Best Practices</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Ensure column headers match expected fields</li>
                <li>Clean data before import (remove duplicates)</li>
                <li>Test with small batch first</li>
                <li>Back up existing data before large imports</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
