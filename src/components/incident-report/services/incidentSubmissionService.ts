import { incidentValidationSchema, type IncidentFormData } from "./submission/validation";
import { saveIncidentToDatabase } from "./submission/database";
import { sendIncidentNotifications } from "./submission/notifications";
import { saveIncidentDocuments } from "./submission/documents";
import { errorLogger } from "@/lib/monitoring/errorLogger";
import type { SubmissionResponse } from "./submission/types";

export async function submitIncident(formData: IncidentFormData): Promise<SubmissionResponse> {
  try {
    // Validate the form data
    const validatedData = incidentValidationSchema.parse(formData);

    // Extract documents from validated data
    const { documents, ...incidentData } = validatedData;

    // Save to database
    const result = await saveIncidentToDatabase(incidentData);

    if (result.success && result.incidentId) {
      // Save document references if any
      if (documents && documents.length > 0) {
        const docResult = await saveIncidentDocuments(result.incidentId, documents);
        if (!docResult.success) {
          // Log the error but don't fail the whole submission
          errorLogger.warn('Failed to save document references', new Error(docResult.error || 'Unknown error'));
        }
      }

      // Send notifications
      await sendIncidentNotifications(result.incidentId);
    }

    return result;
  } catch (error) {
    errorLogger.error('Error submitting incident', error instanceof Error ? error : new Error('Unknown error'));
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}

export { incidentValidationSchema };
export type { IncidentFormData };