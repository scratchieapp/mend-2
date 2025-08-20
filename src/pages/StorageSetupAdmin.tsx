import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Database, Info } from 'lucide-react';
import { setupStorageBuckets } from '@/lib/storage/setupStorage';
import { useAuth } from '@/lib/auth/AuthContext';
import { Navigate } from 'react-router-dom';
import { isSuperAdmin } from '@/lib/auth/roles';

export default function StorageSetupAdmin() {
  const { userData } = useAuth();
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupResult, setSetupResult] = useState<{ success: boolean; message: string } | null>(null);

  // Only super admins can access this page
  if (!userData || !isSuperAdmin(userData.role_id)) {
    return <Navigate to="/unauthorized" replace />;
  }

  const handleSetup = async () => {
    setIsSettingUp(true);
    setSetupResult(null);

    try {
      const result = await setupStorageBuckets();
      setSetupResult({
        success: result.success,
        message: result.success 
          ? result.message || 'Storage setup completed successfully'
          : result.error || 'Storage setup failed'
      });
    } catch (error) {
      setSetupResult({
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Storage Setup</h1>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Supabase Storage Configuration</CardTitle>
            <CardDescription>
              Set up storage buckets for incident documentation and file uploads
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This will create the necessary storage buckets in Supabase for storing incident-related files.
                The bucket will be configured with:
                <ul className="list-disc list-inside mt-2">
                  <li>20MB file size limit</li>
                  <li>Support for images, PDFs, and Word documents</li>
                  <li>Private access (requires authentication)</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleSetup}
              disabled={isSettingUp}
              className="w-full"
            >
              <Database className="mr-2 h-4 w-4" />
              {isSettingUp ? 'Setting up storage...' : 'Setup Storage Buckets'}
            </Button>

            {setupResult && (
              <Alert variant={setupResult.success ? 'default' : 'destructive'}>
                {setupResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{setupResult.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage Policies</CardTitle>
            <CardDescription>
              Row Level Security policies for storage access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Storage policies need to be configured in the Supabase dashboard:
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Go to Storage → Policies in your Supabase dashboard</li>
                  <li>Select the "incident-documents" bucket</li>
                  <li>Add policies for:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>Authenticated users can upload files</li>
                      <li>Users can view files for their incidents</li>
                      <li>Users can delete their own files</li>
                      <li>Admins can manage all files</li>
                    </ul>
                  </li>
                </ol>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Migration</CardTitle>
            <CardDescription>
              Database table for storing file references
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                The incident_documents table migration has been created at:
                <code className="block mt-2 p-2 bg-muted rounded text-sm">
                  supabase/migrations/20240101000000_incident_documents.sql
                </code>
                Run this migration in your Supabase dashboard under SQL Editor.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}