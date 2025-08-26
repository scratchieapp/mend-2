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
  updated_at?: string; // Made optional for optimized function
  // Worker details
  worker_id: number;
  worker_name?: string; // Simplified from first/last
  worker_full_name?: string; // For compatibility
  worker_first_name?: string; // Optional for compatibility
  worker_last_name?: string; // Optional for compatibility
  worker_occupation?: string;
  worker_employee_number?: string;
  // Employer details
  employer_id: number;
  employer_name: string;
  employer_abn?: string; // Made optional for optimized function
  // Medical professional details (optional for listing)
  medical_professional_id?: number | null;
  medical_professional_name?: string | null;
  medical_professional_specialty?: string | null;
  medical_professional_phone?: string | null;
  // Site details
  site_id: number;
  site_name: string;
  site_location?: string; // Made optional for optimized function
  // Department details (optional for listing)
  department_id?: number;
  department_name?: string;
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
      pageSize = 25, // Optimized page size
      pageOffset = 0,
      employerId = null,
      workerId = null,
      startDate = null,
      endDate = null,
      userRoleId = null,
      userEmployerId = null
    } = params;

    // Use the new RBAC function that properly handles role-based access
    // Super Admin (role_id = 1) will see ALL incidents
    // Builder Admin (role_id = 5) will see only their employer's incidents
    const { data: incidents, error: incidentsError } = await supabase
      .rpc('get_incidents_with_details_rbac', {
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
      // Fallback to old function if new one doesn't exist yet
      if (incidentsError.message.includes('function get_incidents_with_details_rbac')) {
        console.warn('RBAC function not found, falling back to standard function');
        const { data: fallbackIncidents, error: fallbackError } = await supabase
          .rpc('get_incidents_with_details', {
            page_size: pageSize,
            page_offset: pageOffset,
            filter_employer_id: employerId,
            filter_worker_id: workerId,
            filter_start_date: startDate,
            filter_end_date: endDate
          });
        
        if (fallbackError) throw new Error(`Failed to fetch incidents: ${fallbackError.message}`);
        
        // For fallback, apply frontend filtering for Super Admin
        const filteredIncidents = userRoleId === 1 ? fallbackIncidents : 
          (fallbackIncidents || []).filter((inc: IncidentWithDetails) => 
            !userEmployerId || inc.employer_id === userEmployerId
          );
        
        return {
          incidents: filteredIncidents || [],
          totalCount: filteredIncidents?.length || 0,
          pageSize,
          currentPage: 1,
          totalPages: 1
        };
      }
      throw new Error(`Failed to fetch incidents: ${incidentsError.message}`);
    }

    // Get total count for pagination using RBAC function
    const { data: countData, error: countError } = await supabase
      .rpc('get_incidents_count_rbac', {
        filter_employer_id: employerId,
        filter_worker_id: workerId,
        filter_start_date: startDate,
        filter_end_date: endDate,
        user_role_id: userRoleId,
        user_employer_id: userEmployerId
      });

    if (countError) {
      console.error('Error fetching incidents count:', countError);
      // Fallback count if RBAC function doesn't exist
      if (countError.message.includes('function get_incidents_count_rbac')) {
        const totalCount = incidents?.length || 0;
        return {
          incidents: incidents || [],
          totalCount,
          pageSize,
          currentPage: 1,
          totalPages: Math.ceil(totalCount / pageSize)
        };
      }
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
 * Get recent incidents for dashboard with optimized query
 */
export async function getRecentIncidents(
  limit = 5, // Reduced default for faster dashboard loads
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