// User type for user management
export interface User {
  user_id: string;
  email?: string | null;
  display_name?: string | null;
  user_name?: string | null;
  custom_display_name?: string | null;
  role_id: number;
  employer_id?: number | null;
  site_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_seen_at?: string | null;
  clerk_user_id?: string | null;
  role?: {
    role_id: number;
    role_name: string;
    role_label: string;
  };
  employer?: {
    employer_id: number;
    employer_name: string;
  };
}

export interface UserRole {
  role_id: number;
  role_name: string;
  role_label: string;
}

export interface Employer {
  employer_id: number;
  employer_name: string;
}

