import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface IncidentMetrics {
  totalIncidents: number;
  avgLostTime: number;
  totalLostDays: number;
  totalClaimCosts: number;
  psychosocialCount: number;
  fatalityCount: number;
  ltiCount: number;
  mtiCount: number;
  faiCount: number;
}

/**
 * Get incident metrics with RBAC support
 */
export async function getIncidentMetrics(params: {
  userRoleId?: number;
  userEmployerId?: number;
  filterEmployerId?: number;
  selectedMonth?: string;
}): Promise<IncidentMetrics> {
  try {
    const { userRoleId, userEmployerId, filterEmployerId, selectedMonth } = params;

    // Calculate date range if month is provided
    let startDate: string | undefined;
    let endDate: string | undefined;
    
    if (selectedMonth) {
      const monthDate = new Date(selectedMonth);
      startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');
    }

    // Call the RBAC metrics function
    const { data, error } = await supabase.rpc('get_incident_metrics_rbac', {
      user_role_id: userRoleId || null,
      user_employer_id: userEmployerId || null,
      filter_employer_id: filterEmployerId || null,
      filter_start_date: startDate || null,
      filter_end_date: endDate || null
    });

    if (error) {
      console.error('Error fetching metrics:', error);
      // Return empty metrics on error
      return {
        totalIncidents: 0,
        avgLostTime: 0,
        totalLostDays: 0,
        totalClaimCosts: 0,
        psychosocialCount: 0,
        fatalityCount: 0,
        ltiCount: 0,
        mtiCount: 0,
        faiCount: 0
      };
    }

    // The function returns an array with one row
    const metrics = data && data[0] ? data[0] : {};

    return {
      totalIncidents: metrics.total_incidents || 0,
      avgLostTime: metrics.avg_lost_time || 0,
      totalLostDays: metrics.total_lost_days || 0,
      totalClaimCosts: metrics.total_claim_costs || 0,
      psychosocialCount: metrics.psychosocial_count || 0,
      fatalityCount: metrics.fatality_count || 0,
      ltiCount: metrics.lti_count || 0,
      mtiCount: metrics.mti_count || 0,
      faiCount: metrics.fai_count || 0
    };
  } catch (error) {
    console.error('Error in getIncidentMetrics:', error);
    // Return empty metrics on error
    return {
      totalIncidents: 0,
      avgLostTime: 0,
      totalLostDays: 0,
      totalClaimCosts: 0,
      psychosocialCount: 0,
      fatalityCount: 0,
      ltiCount: 0,
      mtiCount: 0,
      faiCount: 0
    };
  }
}

/**
 * Get user's assigned employers
 */
export async function getUserEmployers(userId: string) {
  try {
    const { data, error } = await supabase.rpc('get_user_employers', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error fetching user employers:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserEmployers:', error);
    return [];
  }
}

/**
 * Assign user to an employer
 */
export async function assignUserToEmployer(
  userId: string,
  employerId: number,
  isPrimary: boolean = false,
  assignedBy?: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('assign_user_to_employer', {
      p_user_id: userId,
      p_employer_id: employerId,
      p_is_primary: isPrimary,
      p_assigned_by: assignedBy || null
    });

    if (error) {
      console.error('Error assigning user to employer:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error in assignUserToEmployer:', error);
    return false;
  }
}

/**
 * Remove user from an employer
 */
export async function removeUserFromEmployer(
  userId: string,
  employerId: number
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('remove_user_from_employer', {
      p_user_id: userId,
      p_employer_id: employerId
    });

    if (error) {
      console.error('Error removing user from employer:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error in removeUserFromEmployer:', error);
    return false;
  }
}