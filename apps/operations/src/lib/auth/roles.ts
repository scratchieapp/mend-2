// src/lib/auth/roles.ts
import { Database } from "@/integrations/supabase/types";

// We're defining our own type that matches what Supabase returns
// This is a simplified version for our specific query
type UserRole = {
  role_id: number;
  role_name: string;
  role_label: string;
};

type User = {
  user_id: string;
  email?: string | null;
  display_name?: string | null;
  custom_display_name?: string | null;
  role_id?: number | null;
  employer_id?: string | null;
  site_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_seen_at?: string | null;
  role?: UserRole;
};

export type UserData = User;

// Role IDs matching database values
export const ROLES = {
  MEND_SUPER_ADMIN: 1,
  MEND_ACCOUNT_MANAGER: 2,
  MEND_DATA_ENTRY: 3,  // Corrected to match database
  MEND_ANALYST: 4,
  BUILDER_ADMIN: 5,
  SITE_ADMIN: 6,
  CLIENT: 7,  // Client companies/workers
  VENDOR: 8,  // Insurance/Government/Medical
  PUBLIC: 9,
};

// Role names for string-based comparisons
export const ROLE_NAMES = {
  MEND_SUPER_ADMIN: 'mend_super_admin',
  MEND_ACCOUNT_MANAGER: 'mend_account_manager',
  MEND_DATA_ENTRY: 'mend_data_entry',
  MEND_ANALYST: 'mend_analyst',
  BUILDER_ADMIN: 'builder_admin',
  SITE_ADMIN: 'site_admin',
  CLIENT: 'client',
  VENDOR: 'vendor',
  PUBLIC: 'public',
};

/**
 * Check if user has super admin role
 */
export const isSuperAdmin = (roleIdOrUserData?: number | UserData | null): boolean => {
  if (typeof roleIdOrUserData === 'number') {
    return roleIdOrUserData === ROLES.MEND_SUPER_ADMIN;
  }
  if (roleIdOrUserData?.role?.role_id !== undefined) {
    return roleIdOrUserData.role.role_id === ROLES.MEND_SUPER_ADMIN;
  }
  // Handle case where role_id might be directly on the object
  if (roleIdOrUserData && 'role_id' in roleIdOrUserData) {
    return (roleIdOrUserData as UserData & { role_id: number }).role_id === ROLES.MEND_SUPER_ADMIN;
  }
  return false;
};

/**
 * Check if user has any admin role (Mend or Builder)
 */
export const isAdmin = (roleIdOrUserData?: number | UserData | null): boolean => {
  if (typeof roleIdOrUserData === 'number') {
    return roleIdOrUserData === ROLES.MEND_SUPER_ADMIN || roleIdOrUserData === ROLES.BUILDER_ADMIN;
  }
  if (roleIdOrUserData?.role?.role_id !== undefined) {
    const roleId = roleIdOrUserData.role.role_id;
    return roleId === ROLES.MEND_SUPER_ADMIN || roleId === ROLES.BUILDER_ADMIN;
  }
  if (roleIdOrUserData && 'role_id' in roleIdOrUserData) {
    const roleId = (roleIdOrUserData as UserData & { role_id: number }).role_id;
    return roleId === ROLES.MEND_SUPER_ADMIN || roleId === ROLES.BUILDER_ADMIN;
  }
  return false;
};

/**
 * Check if user has builder admin role
 */
export const isBuilderAdmin = (roleIdOrUserData?: number | UserData | null): boolean => {
  if (typeof roleIdOrUserData === 'number') {
    return roleIdOrUserData === ROLES.BUILDER_ADMIN;
  }
  if (roleIdOrUserData?.role?.role_id !== undefined) {
    return roleIdOrUserData.role.role_id === ROLES.BUILDER_ADMIN;
  }
  if (roleIdOrUserData && 'role_id' in roleIdOrUserData) {
    return (roleIdOrUserData as UserData & { role_id: number }).role_id === ROLES.BUILDER_ADMIN;
  }
  return false;
};

/**
 * Check if user has MEND data entry role (role_id 3)
 */
export const isMendDataEntry = (roleIdOrUserData?: number | UserData | null): boolean => {
  if (typeof roleIdOrUserData === 'number') {
    return roleIdOrUserData === ROLES.MEND_DATA_ENTRY;
  }
  if (roleIdOrUserData?.role?.role_id !== undefined) {
    return roleIdOrUserData.role.role_id === ROLES.MEND_DATA_ENTRY;
  }
  if (roleIdOrUserData && 'role_id' in roleIdOrUserData) {
    return (roleIdOrUserData as UserData & { role_id: number }).role_id === ROLES.MEND_DATA_ENTRY;
  }
  return false;
};

/**
 * Check if user has site admin role
 */
export const isSiteAdmin = (userData?: UserData | null): boolean => {
  return userData?.role?.role_id === ROLES.SITE_ADMIN;
};

/**
 * Check if user is a Mend staff member
 */
export const isMendStaff = (userData?: UserData | null): boolean => {
  const mendRoles = [
    ROLES.MEND_SUPER_ADMIN,
    ROLES.MEND_ACCOUNT_MANAGER,
    ROLES.MEND_DATA_ENTRY,
    ROLES.MEND_ANALYST
  ];
  return mendRoles.includes(userData?.role?.role_id || 0);
};

/**
 * Check if user is a worker (client or public role)
 */
export const isWorker = (userData?: UserData | null): boolean => {
  const workerRoles = [ROLES.CLIENT, ROLES.PUBLIC];
  return workerRoles.includes(userData?.role?.role_id || 0);
};

/**
 * Check if user has access to a specific employer
 */
export const hasEmployerAccess = (userData: UserData | null, employerId?: number | null): boolean => {
  if (!userData || !employerId) return false;
  
  // Super admins and builder admins have access to all employers
  if (isAdmin(userData)) return true;
  
  // Site admins have access to their employer
  if (isSiteAdmin(userData) && userData.employer_id === employerId.toString()) {
    return true;
  }
  
  // Clients have access to their employer
  if (userData.role?.role_id === ROLES.CLIENT && userData.employer_id === employerId.toString()) {
    return true;
  }
  
  return false;
};

/**
 * Check if user has access to a specific site
 */
export const hasSiteAccess = (userData: UserData | null, siteId?: number | null): boolean => {
  if (!userData || !siteId) return false;
  
  // Super admins and builder admins have access to all sites
  if (isAdmin(userData)) return true;
  
  // Site admins have access to their assigned site
  if (isSiteAdmin(userData) && userData.site_id === siteId.toString()) {
    return true;
  }
  
  // Mend staff have access to all sites
  if (isMendStaff(userData)) return true;
  
  return false;
};

/**
 * Check if current user can manage another user
 */
export const canManageUser = (currentUser: UserData | null, targetUser: UserData | null): boolean => {
  if (!currentUser || !targetUser) return false;
  
  // Super admins can manage all users
  if (isSuperAdmin(currentUser)) return true;
  
  // Builder admins can manage users in their organization
  if (isBuilderAdmin(currentUser) && currentUser.employer_id === targetUser.employer_id) {
    // But they cannot manage Mend staff or other builder admins
    if (isMendStaff(targetUser) || targetUser.role?.role_id === ROLES.BUILDER_ADMIN) {
      return false;
    }
    return true;
  }
  
  // Site admins can manage users in their site
  if (isSiteAdmin(currentUser) && currentUser.site_id === targetUser.site_id) {
    // But they cannot manage admins or Mend staff
    if (isAdmin(targetUser) || isMendStaff(targetUser)) {
      return false;
    }
    return true;
  }
  
  // Mend account managers can manage client users
  if (currentUser.role?.role_id === ROLES.MEND_ACCOUNT_MANAGER) {
    // Can manage clients and vendors but not other Mend staff or admins
    if (targetUser.role?.role_id === ROLES.CLIENT || targetUser.role?.role_id === ROLES.VENDOR) {
      return true;
    }
  }
  
  return false;
};

/**
 * Get list of roles that the current user can create
 */
export const getAvailableRolesToCreate = (userData: UserData | null): string[] => {
  if (!userData) return [];
  
  // Super admins can create any role
  if (isSuperAdmin(userData)) {
    return [
      ROLE_NAMES.MEND_ACCOUNT_MANAGER,
      ROLE_NAMES.MEND_DATA_ENTRY,
      ROLE_NAMES.MEND_ANALYST,
      ROLE_NAMES.BUILDER_ADMIN,
      ROLE_NAMES.SITE_ADMIN,
      ROLE_NAMES.CLIENT,
      ROLE_NAMES.VENDOR,
      ROLE_NAMES.PUBLIC
    ];
  }
  
  // Builder admins can create certain roles within their organization
  if (isBuilderAdmin(userData)) {
    return [
      ROLE_NAMES.SITE_ADMIN,
      ROLE_NAMES.CLIENT,
      ROLE_NAMES.VENDOR,
      ROLE_NAMES.PUBLIC
    ];
  }
  
  // Site admins can create basic user roles
  if (isSiteAdmin(userData)) {
    return [
      ROLE_NAMES.CLIENT,
      ROLE_NAMES.VENDOR,
      ROLE_NAMES.PUBLIC
    ];
  }
  
  // Mend account managers can create client roles
  if (userData.role?.role_id === ROLES.MEND_ACCOUNT_MANAGER) {
    return [
      ROLE_NAMES.CLIENT,
      ROLE_NAMES.VENDOR
    ];
  }
  
  return [];
};