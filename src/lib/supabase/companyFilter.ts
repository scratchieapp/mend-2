import { supabase } from '@/integrations/supabase/client';
import { useClerkAuthContext } from '@/lib/clerk/ClerkAuthProvider';

/**
 * Adds company-specific filtering to Supabase queries based on user's role and employer
 */
export function useCompanyFilter() {
  const { user } = useClerkAuthContext();

  /**
   * Apply company filter to a query builder
   * @param query - The Supabase query builder
   * @param tableName - The name of the table being queried
   * @returns The filtered query
   */
  const applyCompanyFilter = <T extends any>(
    query: T,
    tableName: 'incidents' | 'sites' | 'workers' | 'employers'
  ): T => {
    if (!user) return query;

    const userRole = user.role?.role_name;
    const employerId = user.employer_id;

    // Super admins can see everything
    if (userRole === 'mend_super_admin' || userRole === 'administrator') {
      return query;
    }

    // Medical professionals can see all incidents (for treatment purposes)
    if (userRole === 'medical_professional' && tableName === 'incidents') {
      return query;
    }

    // All other users see only their company's data
    if (employerId) {
      // @ts-ignore - Supabase query builder typing issue
      return query.eq('employer_id', employerId);
    }

    // If no employer_id, return empty results
    // @ts-ignore
    return query.eq('employer_id', -1); // Impossible ID to return no results
  };

  /**
   * Check if user can access a specific employer's data
   * @param employerId - The employer ID to check
   * @returns Boolean indicating access permission
   */
  const canAccessEmployer = (employerId: string | number | null): boolean => {
    if (!user || !employerId) return false;

    const userRole = user.role?.role_name;
    
    // Admins can access all employers
    if (userRole === 'mend_super_admin' || userRole === 'administrator' || userRole === 'builder_admin') {
      return true;
    }

    // Users can only access their own employer's data
    return user.employer_id === String(employerId);
  };

  /**
   * Check if user can access a specific site
   * @param siteId - The site ID to check
   * @param siteEmployerId - The employer ID of the site
   * @returns Boolean indicating access permission
   */
  const canAccessSite = (siteId: string | number | null, siteEmployerId: string | number | null): boolean => {
    if (!user || !siteId) return false;

    const userRole = user.role?.role_name;
    
    // Admins can access all sites
    if (userRole === 'mend_super_admin' || userRole === 'administrator' || userRole === 'builder_admin') {
      return true;
    }

    // Site admins can access their assigned site
    if (userRole === 'site_admin' && user.site_id === String(siteId)) {
      return true;
    }

    // Users can access sites belonging to their employer
    return canAccessEmployer(siteEmployerId);
  };

  /**
   * Get filtered query for incidents
   */
  const getFilteredIncidents = () => {
    let query = supabase.from('incidents').select('*');
    return applyCompanyFilter(query, 'incidents');
  };

  /**
   * Get filtered query for sites
   */
  const getFilteredSites = () => {
    let query = supabase.from('sites').select('*');
    return applyCompanyFilter(query, 'sites');
  };

  /**
   * Get filtered query for workers
   */
  const getFilteredWorkers = () => {
    let query = supabase.from('workers').select('*');
    return applyCompanyFilter(query, 'workers');
  };

  return {
    applyCompanyFilter,
    canAccessEmployer,
    canAccessSite,
    getFilteredIncidents,
    getFilteredSites,
    getFilteredWorkers,
  };
}

/**
 * HOC to wrap components with company filtering
 */
export function withCompanyFilter<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return (props: P) => {
    const { user } = useClerkAuthContext();

    if (!user?.employer_id && user?.role?.role_name !== 'mend_super_admin') {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">No Company Assigned</h2>
            <p className="text-muted-foreground">
              Please contact your administrator to be assigned to a company.
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}