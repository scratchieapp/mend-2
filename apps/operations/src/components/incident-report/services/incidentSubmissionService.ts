import { incidentValidationSchema, type IncidentFormData } from "./submission/validation";
import { saveIncidentToDatabase } from "./submission/database";
import { sendIncidentNotifications } from "./submission/notifications";
import { saveIncidentDocuments } from "./submission/documents";
import { errorLogger } from "@/lib/monitoring/errorLogger";
import type { SubmissionResponse } from "./submission/types";

export async function submitIncident(formData: IncidentFormData): Promise<SubmissionResponse> {
  console.log('=== INCIDENT SUBMISSION DEBUG ===');
  console.log('1. Starting submission with form data:', JSON.stringify(formData, null, 2));
  
  try {
    // Validate the form data
    console.log('2. Validating form data...');
    const validatedData = incidentValidationSchema.parse(formData);
    console.log('3. Validation passed. Validated data:', JSON.stringify(validatedData, null, 2));

    // Extract documents from validated data
    const { documents, ...incidentData } = validatedData;
    console.log('4. Incident data (without documents):', JSON.stringify(incidentData, null, 2));

    // Save to database
    console.log('5. Calling saveIncidentToDatabase...');
    const result = await saveIncidentToDatabase(incidentData);
    console.log('6. Database result:', JSON.stringify(result, null, 2));

    if (result.success && result.incidentId) {
      console.log('7. SUCCESS! Incident ID:', result.incidentId);
      
      // Save document references if any
      if (documents && documents.length > 0) {
        console.log('8. Saving documents...');
        const docResult = await saveIncidentDocuments(result.incidentId, documents);
        if (!docResult.success) {
          // Log the error but don't fail the whole submission
          console.warn('9. Document save warning:', docResult.error);
          errorLogger.warn('Failed to save document references', new Error(docResult.error || 'Unknown error'));
        }
      }

      // Send notifications
      console.log('10. Sending notifications...');
      await sendIncidentNotifications(result.incidentId);
      console.log('11. Notifications sent');
    } else {
      console.log('7. FAILED - result indicates failure:', result);
    }

    return result;
  } catch (error) {
    console.error('=== SUBMISSION ERROR ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Full error:', error);
    
    // Check if it's a Zod validation error
    if (error && typeof error === 'object' && 'issues' in error) {
      console.error('Zod validation errors:', JSON.stringify((error as any).issues, null, 2));
    }
    
    errorLogger.error('Error submitting incident', error instanceof Error ? error : new Error('Unknown error'));
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}

export { incidentValidationSchema };
export type { IncidentFormData };