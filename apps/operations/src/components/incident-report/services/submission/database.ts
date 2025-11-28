import { supabase } from "@/integrations/supabase/client";
import { IncidentData, SubmissionResponse } from "./types";
import { logApiError } from "@/lib/monitoring/errorLogger";
import { transformFormDataToDatabase } from "./transformation";

export async function saveIncidentToDatabase(data: IncidentData): Promise<SubmissionResponse> {
  try {
    // Transform the form data to match database schema
    const transformedData = await transformFormDataToDatabase(data);
    
    // Transformed data for database

    // Insert without SELECT to avoid RLS issues when user's employer_id differs
    // We use an RPC to get the ID after insert
    const { error } = await supabase
      .from("incidents")
      .insert([transformedData]);

    if (error) {
      logApiError('/incidents', 'POST', error.message, error.code ? parseInt(error.code) : undefined, { 
        originalData: data,
        transformedData,
        error: error.details || error.hint || error.message
      });
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.details) {
        errorMessage = `Database error: ${error.details}`;
      } else if (error.code === '23502') {
        errorMessage = 'Required field is missing. Please check all required fields.';
      } else if (error.code === '23503') {
        errorMessage = 'Invalid reference. Please check that all selected values are valid.';
      } else if (error.code === '23505') {
        errorMessage = 'Duplicate entry. This incident may have already been recorded.';
      } else if (error.code === '42501') {
        errorMessage = 'Permission denied. Please contact support if this persists.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }

    // INSERT succeeded - we don't have the incident_id but that's OK
    // The dashboard will show the new incident
    return {
      success: true,
      incidentId: undefined // We can't get the ID without SELECT, but submission worked
    };
  } catch (error) {
    logApiError('/incidents', 'POST', error instanceof Error ? error : String(error), undefined, { data });
    
    // Handle transformation errors specifically
    if (error instanceof Error && error.message.includes('transform')) {
      return {
        success: false,
        error: "Failed to process form data. Please check all fields are filled correctly."
      };
    }
    
    return {
      success: false,
      error: "An unexpected error occurred while saving the incident"
    };
  }
}