import { supabase } from "@/integrations/supabase/client";
import { IncidentData, SubmissionResponse } from "./types";
import { logApiError } from "@/lib/monitoring/errorLogger";
import { transformFormDataToDatabase } from "./transformation";

export async function saveIncidentToDatabase(data: IncidentData): Promise<SubmissionResponse> {
  try {
    // Transform the form data to match database schema
    const transformedData = await transformFormDataToDatabase(data);
    
    // Transformed data for database

    // Insert without SELECT to avoid RLS issues
    // The incident_id is auto-generated, so we get it from the response
    const { data: incident, error } = await supabase
      .from("incidents")
      .insert([transformedData])
      .select('incident_id')
      .single();

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
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }

    return {
      success: true,
      incidentId: incident.incident_id
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