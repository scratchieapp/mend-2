import { supabase } from "@/integrations/supabase/client";
import { IncidentData, SubmissionResponse } from "./types";
import { logApiError } from "@/lib/monitoring/errorLogger";
import { transformFormDataToDatabase } from "./transformation";

export async function saveIncidentToDatabase(data: IncidentData): Promise<SubmissionResponse> {
  try {
    // Transform the form data to match database schema
    const transformedData = await transformFormDataToDatabase(data);
    
    // Use RPC function that bypasses RLS - this is necessary because:
    // 1. Company users (role >= 4) can only SELECT incidents for their employer
    // 2. But they may be creating incidents for a different employer (Mend client)
    // 3. The SECURITY DEFINER function bypasses RLS while still being safe
    const { data: result, error } = await supabase
      .rpc('create_incident_bypassing_rls', {
        p_incident_data: transformedData
      });

    if (error) {
      logApiError('/incidents', 'POST', error.message, error.code ? parseInt(error.code) : undefined, { 
        originalData: data,
        transformedData,
        error: error.details || error.hint || error.message
      });
      
      return {
        success: false,
        error: error.message || 'Database error occurred'
      };
    }

    // Check the result from the RPC function
    if (result && typeof result === 'object') {
      const rpcResult = result as { success: boolean; incident_id?: number; error?: string; error_code?: string };
      
      if (rpcResult.success) {
        return {
          success: true,
          incidentId: rpcResult.incident_id
        };
      } else {
        // RPC returned an error
        logApiError('/incidents', 'POST', rpcResult.error || 'Unknown RPC error', undefined, { 
          originalData: data,
          transformedData,
          rpcResult
        });
        
        return {
          success: false,
          error: rpcResult.error || 'Failed to create incident'
        };
      }
    }

    // Unexpected result format
    return {
      success: false,
      error: "Unexpected response from database"
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