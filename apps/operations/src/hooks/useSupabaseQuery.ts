import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { PostgrestError } from '@supabase/supabase-js';

// User data type from AuthContext
type UserData = {
  user_id: string;
  email?: string | null;
  display_name?: string | null;
  custom_display_name?: string | null;
  role_id?: number | null;
  employer_id?: string | null;
  site_id?: string | null;
  role?: {
    role_id: number;
    role_name: string;
    role_label: string;
  };
};

type QueryFn<T> = (userData: UserData) => Promise<{
  data: T | null;
  error: PostgrestError | null;
}>;

export function useSupabaseQuery<T>(
  queryKey: string[],
  queryFn: QueryFn<T>,
  options?: Omit<UseQueryOptions<T, PostgrestError>, 'queryKey' | 'queryFn'>
) {
  const { userData } = useAuth();

  return useQuery<T, PostgrestError>({
    queryKey: [queryKey, userData?.user_id],
    queryFn: async () => {
      if (!userData) {
        throw new Error('No user data available');
      }

      const { data, error } = await queryFn(userData);
      
      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No data returned');
      }

      return data;
    },
    enabled: !!userData,
    ...options,
  });
} 