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

// Role IDs (adjust these to match your database)
export const ROLES = {
  ADMIN: 1,
  EMPLOYER_ADMIN: 2,
  SITE_MANAGER: 3,
  USER: 4,
  // Add other roles as needed
};

/**
 * Check if user has admin role
 */
export const isAdmin = (userData?: UserData | null): boolean => {
  return userData?.role?.role_id === ROLES.ADMIN;
};

/**
 * Check if user has employer admin role
 */
export const isEmployerAdmin = (userData?: UserData | null): boolean => {
  return userData?.role?.role_id === ROLES.EMPLOYER_ADMIN;
};

/**
 * Check if user has site manager role
 */
export const isSiteManager = (userData?: UserData | null): boolean => {
  return userData?.role?.role_id === ROLES.SITE_MANAGER;
};

/**
 * Check if user has access to a specific employer
 */
export const hasEmployerAccess = (userData: UserData | null, employerId?: number | null): boolean => {
  if (!userData || !employerId) return false;
  
  // Admins have access to all employers
  if (isAdmin(userData)) return true;
  
  // Employer admins have access to their assigned employer
  if (isEmployerAdmin(userData) && userData.employer_id === employerId.toString()) {
    return true;
  }
  
  return false;
};

/**
 * Check if user has access to a specific site
 */
export const hasSiteAccess = (userData: UserData | null, siteId?: number | null): boolean => {
  if (!userData || !siteId) return false;
  
  // Admins have access to all sites
  if (isAdmin(userData)) return true;
  
  // Site managers have access to their assigned site
  if (isSiteManager(userData) && userData.site_id === siteId.toString()) {
    return true;
  }
  
  // For other role-based site access logic
  
  return false;
};