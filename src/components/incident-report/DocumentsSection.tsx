import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormDescription, FormMessage } from '@/components/ui/form';
import { FileUpload } from '@/components/FileUpload';
import type { IncidentReportFormData } from '@/lib/validations/incident';

interface DocumentsSectionProps {
  form: UseFormReturn<IncidentReportFormData>;
}

export function DocumentsSection({ form }: DocumentsSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Supporting Documents</h3>
        <p className="text-sm text-muted-foreground mt-1">
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
            </FormDescription>
            <FileUpload
              onFilesChange={(files) => {
                // Store file URLs in form
                const urls = files.map(f => ({
                  url: f.url || '',
                  name: f.name,
                  type: f.type,
                  size: f.size
                }));
                field.onChange(urls);
              }}
              maxFiles={10}
              maxSizeInMB={20}
              bucketName="incident-documents"
              folderPath="incidents"
              disabled={form.formState.isSubmitting}
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}