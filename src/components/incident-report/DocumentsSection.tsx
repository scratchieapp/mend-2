import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormDescription, FormMessage } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Trash2, Upload, Image, FileIcon } from 'lucide-react';
import type { IncidentReportFormData } from '@/lib/validations/incident';
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { 
  uploadIncidentDocument,
  deleteIncidentDocument,
  downloadIncidentDocument,
  isValidFileType,
  formatFileSize,
  type UploadProgress
} from '@/lib/supabase/incident-documents';

interface DocumentsSectionProps {
  form: UseFormReturn<IncidentReportFormData>;
}

interface UploadedDocument {
  id?: string;
  name: string;
  url: string;
  type: string;
  size: number;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function DocumentsSection({ form }: DocumentsSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const documents = form.watch('documents') || [];

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const invalidFiles = files.filter(file => !isValidFileType(file));
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file types",
        description: `${invalidFiles.length} file(s) have invalid types. Please upload images, PDFs, or Word documents only.`,
        variant: "destructive"
      });
      return;
    }

    // Check file size limit (20MB)
    const oversizedFiles = files.filter(file => file.size > 20 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Files too large",
        description: `${oversizedFiles.length} file(s) exceed the 20MB limit.`,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const currentDocs = form.getValues('documents') || [];
      
      // Add files to form with uploading status
      const newDocs = files.map(file => ({
        name: file.name,
        url: '',
        type: file.type,
        size: file.size,
        isUploading: true,
        uploadProgress: 0
      }));

      form.setValue('documents', [...currentDocs, ...newDocs]);

      // Upload files one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const tempDocIndex = currentDocs.length + i;

        try {
          // For now, we'll simulate upload since we don't have an incident ID yet
          // In real scenario, this would be called after incident creation
          const fileKey = `temp_${Date.now()}_${i}`;
          
          // Simulate upload progress
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              const current = prev[fileKey] || 0;
              if (current >= 90) {
                clearInterval(progressInterval);
                return prev;
              }
              return { ...prev, [fileKey]: current + 10 };
            });
          }, 200);

          // Simulate upload completion
          setTimeout(() => {
            clearInterval(progressInterval);
            setUploadProgress(prev => ({ ...prev, [fileKey]: 100 }));
            
            // Update document with final URL
            const updatedDocs = form.getValues('documents') || [];
            updatedDocs[tempDocIndex] = {
              ...updatedDocs[tempDocIndex],
              url: `temp://${file.name}`, // Temporary URL for demo
              isUploading: false,
              uploadProgress: undefined
            };
            form.setValue('documents', updatedDocs);
          }, 2000);

        } catch (error) {
          console.error('Upload failed:', error);
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}`,
            variant: "destructive"
          });
          
          // Remove failed upload from form
          const currentDocs = form.getValues('documents') || [];
          currentDocs.splice(tempDocIndex, 1);
          form.setValue('documents', currentDocs);
        }
      }
    } finally {
      setUploading(false);
      // Clear file input
      event.target.value = '';
    }
  }, [form]);

  const handleDeleteDocument = useCallback(async (index: number) => {
    const currentDocs = form.getValues('documents') || [];
    const doc = currentDocs[index];

    try {
      if (doc.id) {
        // Real deletion for uploaded documents
        await deleteIncidentDocument(doc.id, doc.url);
      }
      
      // Remove from form
      const updatedDocs = currentDocs.filter((_, i) => i !== index);
      form.setValue('documents', updatedDocs);
      
      toast({
        title: "Document deleted",
        description: `${doc.name} has been removed`,
      });
    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        title: "Delete failed",
        description: `Failed to delete ${doc.name}`,
        variant: "destructive"
      });
    }
  }, [form]);

  const handleDownloadDocument = useCallback(async (doc: UploadedDocument) => {
    try {
      if (doc.url.startsWith('temp://')) {
        toast({
          title: "Download not available",
          description: "Document is still being processed",
          variant: "destructive"
        });
        return;
      }
      
      await downloadIncidentDocument(doc.url, doc.name);
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: `Failed to download ${doc.name}`,
        variant: "destructive"
      });
    }
  }, []);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  };

  const getFileTypeColor = (type: string) => {
    if (type.startsWith('image/')) return 'bg-green-100 text-green-800';
    if (type === 'application/pdf') return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Upload any relevant documents, photos, or evidence related to the incident.
        </p>
      </div>

      <FormField
        control={form.control}
        name="documents"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Incident Documentation</FormLabel>
            <FormDescription>
              Upload photos of the incident scene, injury, equipment involved, witness statements, 
              or any other relevant documentation. Accepted formats: Images (JPG, PNG), PDFs, Word documents.
              Maximum file size: 20MB per file.
            </FormDescription>
            
            {/* Upload Area */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Drop files here or click to browse
              </p>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.csv"
                onChange={handleFileSelect}
                disabled={uploading || form.formState.isSubmitting}
                className="hidden"
                id="file-upload"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={uploading || form.formState.isSubmitting}
              >
                Select Files
              </Button>
            </div>

            {/* Uploaded Documents */}
            {documents.length > 0 && (
              <div className="space-y-3 mt-4">
                <h4 className="font-medium">Uploaded Documents ({documents.length})</h4>
                {documents.map((doc: UploadedDocument, index: number) => (
                  <Card key={index} className="p-4">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {getFileIcon(doc.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.name}</p>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${getFileTypeColor(doc.type)}`}
                              >
                                {doc.type.split('/')[1]?.toUpperCase() || 'FILE'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(doc.size)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {doc.isUploading ? (
                            <div className="flex items-center space-x-2">
                              <Progress 
                                value={uploadProgress[`temp_${index}`] || 0} 
                                className="w-20" 
                              />
                              <span className="text-xs text-muted-foreground">
                                {uploadProgress[`temp_${index}`] || 0}%
                              </span>
                            </div>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadDocument(doc)}
                                disabled={doc.url.startsWith('temp://')}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDocument(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}