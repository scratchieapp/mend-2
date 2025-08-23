import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useClerkAuthContext } from '@/lib/clerk/ClerkAuthProvider';

export const Navigation = () => {
  const { user } = useClerkAuthContext();
  
  const { data: roleData } = useQuery({
    queryKey: ['userRole', user?.role_id],
    queryFn: async () => {
      if (!user?.role_id) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role_name')
        .eq('role_id', user.role_id)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!user?.role_id
  });

  const isMendUser = roleData?.role_name?.startsWith('mend_');
  const isBuilderUser = roleData?.role_name?.startsWith('builder_');

  return (
    <nav>
      <ul>
        {isMendUser && <li>Mend User Link</li>}
        {isBuilderUser && <li>Builder User Link</li>}
        <li>Common Link</li>
      </ul>
    </nav>
  );
};
