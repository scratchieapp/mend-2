import { supabase } from "@/integrations/supabase/client";
import { IncidentData, SubmissionResponse } from "./types";
import { logApiError } from "@/lib/monitoring/errorLogger";

export async function saveIncidentToDatabase(data: IncidentData): Promise<SubmissionResponse> {
  try {
    const { data: incident, error } = await supabase
      .from("incidents")
      .insert([data])
      .select()
      .single();

    if (error) {
      logApiError('/incidents', 'POST', error.message, error.code ? parseInt(error.code) : undefined, { data });
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      incidentId: incident.incident_id
    };
  } catch (error) {
    logApiError('/incidents', 'POST', error instanceof Error ? error : String(error), undefined, { data });
    return {
      success: false,
      error: "An unexpected error occurred while saving the incident"
    };
  }
}