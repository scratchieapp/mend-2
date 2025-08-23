// Export types from roles.ts for consistency
export type { UserData } from '@/lib/auth/roles';

// Additional auth-related types
export interface UserRole {
  role_id: number;
  role_name: string;
  role_label: string;
}

export type UserRoleName = string;

// Re-export common role functions
export { 
  isSuperAdmin, 
  isAdmin, 
  isBuilderAdmin, 
  canManageUser, 
  ROLES, 
  ROLE_NAMES 
} from '@/lib/auth/roles';