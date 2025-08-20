import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { PostgrestError } from '@supabase/supabase-js';

type QueryFn<T> = (userData: any) => Promise<{
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