import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Type definitions for incident operations
type IncidentInsert = Database['public']['Tables']['incidents']['Insert'];
type IncidentUpdate = Database['public']['Tables']['incidents']['Update'];

export interface IncidentWithDetails {
  incident_id: number;
  incident_number: string;
  date_of_injury: string;
  time_of_injury: string;
  injury_type: string;
  classification: string;
  injury_description: string;
  fatality: boolean;
  returned_to_work: boolean;
  total_days_lost: number;
  created_at: string;
  updated_at: string;
  // Worker details
  worker_id: number;
  worker_first_name: string;
  worker_last_name: string;
  worker_full_name: string;
  worker_employee_number: string;
  // Employer details
  employer_id: number;
  employer_name: string;
  employer_abn: string;
  // Medical professional details
  medical_professional_id: number | null;
  medical_professional_name: string | null;
  medical_professional_specialty: string | null;
  medical_professional_phone: string | null;
  // Site details
  site_id: number;
  site_name: string;
  site_location: string;
  // Department details
  department_id: number;
  department_name: string;
  // Document count
  document_count: number;
}

export interface IncidentsListParams {
  pageSize?: number;
  pageOffset?: number;
  employerId?: number;
  workerId?: number;
  startDate?: string;
  endDate?: string;
  userRoleId?: number;
  userEmployerId?: number;
}

export interface PaginatedIncidents {
  incidents: IncidentWithDetails[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
}

/**
 * Get paginated list of incidents with all related details
 */
export async function getIncidentsWithDetails(params: IncidentsListParams = {}): Promise<PaginatedIncidents> {
  try {
    const {
      pageSize = 50,
      pageOffset = 0,
      employerId = null,
      workerId = null,
      startDate = null,
      endDate = null,
      userRoleId = null,
      userEmployerId = null
    } = params;

    // Get incidents with details - pass user context for RLS
    const { data: incidents, error: incidentsError } = await supabase
      .rpc('get_incidents_with_details', {
        page_size: pageSize,
        page_offset: pageOffset,
        filter_employer_id: employerId,
        filter_worker_id: workerId,
        filter_start_date: startDate,
        filter_end_date: endDate,
        user_role_id: userRoleId,
        user_employer_id: userEmployerId
      });

    if (incidentsError) {
      console.error('Error fetching incidents:', incidentsError);
      throw new Error(`Failed to fetch incidents: ${incidentsError.message}`);
    }

    // Get total count for pagination - pass user context for RLS
    const { data: countData, error: countError } = await supabase
      .rpc('get_incidents_count', {
        filter_employer_id: employerId,
        filter_worker_id: workerId,
        filter_start_date: startDate,
        filter_end_date: endDate,
        user_role_id: userRoleId,
        user_employer_id: userEmployerId
      });

    if (countError) {
      console.error('Error fetching incidents count:', countError);
      throw new Error(`Failed to fetch incidents count: ${countError.message}`);
    }

    const totalCount = countData || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    const currentPage = Math.floor(pageOffset / pageSize) + 1;

    return {
      incidents: incidents || [],
      totalCount,
      pageSize,
      currentPage,
      totalPages
    };
  } catch (error) {
    console.error('Error in getIncidentsWithDetails:', error);
    throw error;
  }
}

/**
 * Get a single incident with all details
 */
export async function getIncidentById(incidentId: number): Promise<IncidentWithDetails | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_incidents_with_details', {
        page_size: 1,
        page_offset: 0,
        filter_employer_id: null,
        filter_worker_id: null,
        filter_start_date: null,
        filter_end_date: null
      })
      .eq('incident_id', incidentId);

    if (error) {
      console.error('Error fetching incident:', error);
      throw new Error(`Failed to fetch incident: ${error.message}`);
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in getIncidentById:', error);
    throw error;
  }
}

/**
 * Update incident medical professional
 */
export async function updateIncidentMedicalProfessional(
  incidentId: number,
  medicalProfessionalId: number | null
): Promise<void> {
  try {
    const { error } = await supabase
      .from('incidents')
      .update({ medical_professional_id: medicalProfessionalId })
      .eq('incident_id', incidentId);

    if (error) {
      console.error('Error updating incident medical professional:', error);
      throw new Error(`Failed to update medical professional: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in updateIncidentMedicalProfessional:', error);
    throw error;
  }
}

/**
 * Create a new incident
 */
export async function createIncident(incidentData: IncidentInsert): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('incidents')
      .insert([incidentData])
      .select('incident_id')
      .single();

    if (error) {
      console.error('Error creating incident:', error);
      throw new Error(`Failed to create incident: ${error.message}`);
    }

    return data.incident_id;
  } catch (error) {
    console.error('Error in createIncident:', error);
    throw error;
  }
}

/**
 * Update an existing incident
 */
export async function updateIncident(incidentId: number, updates: IncidentUpdate): Promise<void> {
  try {
    const { error } = await supabase
      .from('incidents')
      .update(updates)
      .eq('incident_id', incidentId);

    if (error) {
      console.error('Error updating incident:', error);
      throw new Error(`Failed to update incident: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in updateIncident:', error);
    throw error;
  }
}

/**
 * Delete an incident
 */
export async function deleteIncident(incidentId: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('incidents')
      .delete()
      .eq('incident_id', incidentId);

    if (error) {
      console.error('Error deleting incident:', error);
      throw new Error(`Failed to delete incident: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteIncident:', error);
    throw error;
  }
}

/**
 * Get recent incidents for dashboard
 */
export async function getRecentIncidents(
  limit = 10, 
  userRoleId?: number, 
  userEmployerId?: number
): Promise<IncidentWithDetails[]> {
  try {
    const { incidents } = await getIncidentsWithDetails({
      pageSize: limit,
      pageOffset: 0,
      userRoleId,
      userEmployerId
    });

    return incidents;
  } catch (error) {
    console.error('Error in getRecentIncidents:', error);
    throw error;
  }
}