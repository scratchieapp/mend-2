import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface IncidentMetrics {
  totalIncidents: number;
  avgLostTime: number;      // Not provided by DB function; derived/placeholder
  totalLostDays: number;    // Not provided by DB function; derived/placeholder
  totalClaimCosts: number;  // Maps from total_cost
  psychosocialCount: number;
  fatalityCount: number;    // Not provided; placeholder
  ltiCount: number;         // Not provided; placeholder
  mtiCount: number;         // Not provided; placeholder
  faiCount: number;         // Not provided; placeholder
}

/**
 * Get incident metrics with RBAC support
 */
export async function getIncidentMetrics(params: {
  userRoleId?: number;       // kept for compatibility (not used by optimized RPC)
  userEmployerId?: number;   // kept for compatibility (not used by optimized RPC)
  filterEmployerId?: number; // maps to p_employer_id
  selectedMonth?: string;    // kept for compatibility; not used by current RPC
  dbUserId?: string;         // REQUIRED for optimized metrics RPC
}): Promise<IncidentMetrics> {
  try {
    const { dbUserId, filterEmployerId, selectedMonth } = params;

    // Calculate date range if month is provided
    let startDate: string | undefined;
    let endDate: string | undefined;
    
    if (selectedMonth) {
      const monthDate = new Date(selectedMonth);
      startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');
    }

    // Use the optimized metrics function that takes user UUID.
    // Note: current DB function does not accept date range; we keep those vars for future use.
    const logTiming = import.meta.env.VITE_LOG_RPC_TIMING === 'true';
    if (logTiming) {
      console.time('[rpc] get_incidents_metrics_rbac');
      console.info('[rpc] get_incidents_metrics_rbac:start', new Date().toISOString());
    }
    const useDirect = import.meta.env.VITE_DIRECT_RPC === 'true';
    let data: any = null;
    let error: any = null;
    if (useDirect) {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/get_incidents_metrics_rbac`;
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          apikey,
          Authorization: `Bearer ${apikey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_user_id: dbUserId || null,
          p_employer_id: filterEmployerId || null
        })
      });
      if (!res.ok) {
        error = new Error(`RPC get_incidents_metrics_rbac failed: ${res.status}`);
      } else {
        data = await res.json().catch(() => null);
      }
    } else {
      const resp = await supabase.rpc('get_incidents_metrics_rbac', {
        p_user_id: dbUserId || null,
        p_employer_id: filterEmployerId || null
      });
      data = resp.data;
      error = resp.error;
    }
    if (logTiming) {
      console.info('[rpc] get_incidents_metrics_rbac:end', new Date().toISOString());
      console.timeEnd('[rpc] get_incidents_metrics_rbac');
    }

    if (error) {
      console.error('Error fetching metrics:', error);
      // Return empty metrics on error
      return emptyMetrics();
    }

    // The function returns a single row or array; normalize to object
    const metrics = Array.isArray(data) ? (data[0] || {}) : (data || {});

    return {
      totalIncidents: Number(metrics.total_incidents) || 0,
      avgLostTime: Number(metrics.avg_lost_time) || 0,     // may be 0 if not provided
      totalLostDays: Number(metrics.total_lost_days) || 0, // may be 0 if not provided
      totalClaimCosts: Number(metrics.total_cost) || 0,     // maps from total_cost
      psychosocialCount: Number(metrics.psychosocial_count) || 0,
      fatalityCount: Number(metrics.fatality_count) || 0,
      ltiCount: Number(metrics.lti_count) || 0,
      mtiCount: Number(metrics.mti_count) || 0,
      faiCount: Number(metrics.fai_count) || 0
    };
  } catch (error) {
    console.error('Error in getIncidentMetrics:', error);
    // Return empty metrics on error
    return emptyMetrics();
  }
}

function emptyMetrics(): IncidentMetrics {
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
