import { Label } from "@/components/ui/label";
import { FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, FileText } from "lucide-react";
import type { IncidentReportFormData, IncidentEditFormData } from "@/lib/validations/incident";

interface CaseNotesSectionProps {
  form: UseFormReturn<IncidentReportFormData> | UseFormReturn<IncidentEditFormData>;
}

export function CaseNotesSection({ form }: CaseNotesSectionProps) {
  // Check if call_transcripts field exists (only in edit schema)
  const callTranscripts = useWatch({
    control: form.control,
    name: "call_transcripts" as keyof IncidentEditFormData,
  });

  const hasCallTranscripts = callTranscripts && callTranscripts.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Call Transcripts Section - Read-only display of voice agent transcripts */}
      {'call_transcripts' in (form.getValues() || {}) && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              Call Transcripts
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Transcripts from voice agent calls related to this incident
            </p>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name={"call_transcripts" as keyof IncidentEditFormData}
              render={({ field }) => (
                <FormItem>
                  {hasCallTranscripts ? (
                    <div className="bg-white rounded-md border p-4 max-h-[300px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono text-gray-700">
                        {field.value as string}
                      </pre>
                    </div>
                  ) : (
                    <div className="bg-white rounded-md border p-4 text-center text-muted-foreground">
                      <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No call transcripts available for this incident.</p>
                      <p className="text-xs mt-1">Transcripts will appear here when incidents are reported via voice agent.</p>
                    </div>
                  )}
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* Case Notes Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            Case Notes
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add notes about follow-ups, communications, or case management
          </p>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="case_notes"
            render={({ field }) => (
              <FormItem>
                <Textarea 
                  {...field} 
                  value={field.value || ''}
                  id="case_notes" 
                  className="min-h-[150px]" 
                  placeholder="Enter case notes, follow-up actions, communications with worker/employer, etc."
                />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}