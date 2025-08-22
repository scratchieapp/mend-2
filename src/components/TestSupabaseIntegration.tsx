import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MedicalProfessionalSelect } from '@/components/MedicalProfessionalSelect';
import { 
  getAllMedicalProfessionals, 
  searchMedicalProfessionals 
} from '@/lib/supabase/medical-professionals';
import { 
  getIncidentsWithDetails, 
  updateIncidentMedicalProfessional 
} from '@/lib/supabase/incidents';
import { 
  uploadIncidentDocument, 
  getIncidentDocuments,
  formatFileSize,
  isValidFileType
} from '@/lib/supabase/incident-documents';
import { CheckCircle, XCircle, Upload, FileText, Users, Database } from 'lucide-react';

export function TestSupabaseIntegration() {
  const [testResults, setTestResults] = useState<{
    medicalProfessionals: { status: 'pending' | 'success' | 'error'; message: string };
    incidentsList: { status: 'pending' | 'success' | 'error'; message: string };
    documentUpload: { status: 'pending' | 'success' | 'error'; message: string };
    storageAccess: { status: 'pending' | 'success' | 'error'; message: string };
  }>({
    medicalProfessionals: { status: 'pending', message: 'Not tested yet' },
    incidentsList: { status: 'pending', message: 'Not tested yet' },
    documentUpload: { status: 'pending', message: 'Not tested yet' },
    storageAccess: { status: 'pending', message: 'Not tested yet' },
  });

  const [selectedMedicalProfessional, setSelectedMedicalProfessional] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Test Medical Professionals
  const testMedicalProfessionals = async () => {
    try {
      setTestResults(prev => ({
        ...prev,
        medicalProfessionals: { status: 'pending', message: 'Testing...' }
      }));

      // Test get all
      const allProfessionals = await getAllMedicalProfessionals();
      
      // Test search
      const searchResults = await searchMedicalProfessionals('Dr');

      const message = `Found ${allProfessionals.length} medical professionals. Search returned ${searchResults.length} results.`;
      
      setTestResults(prev => ({
        ...prev,
        medicalProfessionals: { status: 'success', message }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        medicalProfessionals: { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      }));
    }
  };

  // Test Incidents List
  const testIncidentsList = async () => {
    try {
      setTestResults(prev => ({
        ...prev,
        incidentsList: { status: 'pending', message: 'Testing...' }
      }));

      const result = await getIncidentsWithDetails({
        pageSize: 10,
        pageOffset: 0
      });

      const message = `Found ${result.totalCount} total incidents. Showing ${result.incidents.length} on page ${result.currentPage} of ${result.totalPages}.`;
      
      setTestResults(prev => ({
        ...prev,
        incidentsList: { status: 'success', message }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        incidentsList: { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      }));
    }
  };

  // Test Document Upload (with a test file)
  const testDocumentUpload = async () => {
    try {
      setTestResults(prev => ({
        ...prev,
        documentUpload: { status: 'pending', message: 'Testing...' }
      }));

      // Create a test file
      const testContent = 'This is a test document for incident upload testing.';
      const testFile = new File([testContent], 'test-document.txt', { type: 'text/plain' });

      // Check file validity
      if (!isValidFileType(testFile)) {
        throw new Error('Test file type is not valid');
      }

      // Get first incident for testing
      const incidents = await getIncidentsWithDetails({ pageSize: 1 });
      if (incidents.incidents.length === 0) {
        throw new Error('No incidents found for testing');
      }

      const incidentId = incidents.incidents[0].incident_id;

      // Test upload
      const document = await uploadIncidentDocument(
        incidentId,
        testFile,
        (progress) => {
          setUploadProgress(progress.percentage);
        }
      );

      // Test retrieval
      const documents = await getIncidentDocuments(incidentId);

      const message = `Successfully uploaded test document. Incident ${incidentId} now has ${documents.length} document(s).`;
      
      setTestResults(prev => ({
        ...prev,
        documentUpload: { status: 'success', message }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        documentUpload: { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      }));
    }
  };

  // Test Storage Access
  const testStorageAccess = async () => {
    try {
      setTestResults(prev => ({
        ...prev,
        storageAccess: { status: 'pending', message: 'Testing...' }
      }));

      // Test if we can access the storage bucket
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.storage
        .from('incident-documents')
        .list('', { limit: 1 });

      if (error) {
        throw error;
      }

      const message = 'Storage bucket "incident-documents" is accessible.';
      
      setTestResults(prev => ({
        ...prev,
        storageAccess: { status: 'success', message }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        storageAccess: { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Bucket may not exist or no access' 
        }
      }));
    }
  };

  const runAllTests = async () => {
    await testMedicalProfessionals();
    await testIncidentsList();
    await testStorageAccess();
    await testDocumentUpload();
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Supabase Integration Test Suite</CardTitle>
          <CardDescription>
            Test the new medical professionals, document storage, and incidents list features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runAllTests} className="w-full">
            Run All Tests
          </Button>

          <div className="space-y-3">
            {/* Medical Professionals Test */}
            <Alert>
              <Users className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                {getStatusIcon(testResults.medicalProfessionals.status)}
                Medical Professionals API
              </AlertTitle>
              <AlertDescription>{testResults.medicalProfessionals.message}</AlertDescription>
            </Alert>

            {/* Incidents List Test */}
            <Alert>
              <Database className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                {getStatusIcon(testResults.incidentsList.status)}
                Incidents List with Details
              </AlertTitle>
              <AlertDescription>{testResults.incidentsList.message}</AlertDescription>
            </Alert>

            {/* Storage Access Test */}
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                {getStatusIcon(testResults.storageAccess.status)}
                Storage Bucket Access
              </AlertTitle>
              <AlertDescription>{testResults.storageAccess.message}</AlertDescription>
            </Alert>

            {/* Document Upload Test */}
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                {getStatusIcon(testResults.documentUpload.status)}
                Document Upload
              </AlertTitle>
              <AlertDescription>
                {testResults.documentUpload.message}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </div>

          {/* Test Medical Professional Selector */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="text-sm font-medium">Test Medical Professional Selector</h3>
            <MedicalProfessionalSelect
              value={selectedMedicalProfessional}
              onChange={setSelectedMedicalProfessional}
              placeholder="Select a medical professional..."
            />
            {selectedMedicalProfessional && (
              <p className="text-sm text-muted-foreground">
                Selected ID: {selectedMedicalProfessional}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}