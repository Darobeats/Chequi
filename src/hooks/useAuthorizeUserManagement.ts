import { useQuery } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useAuthorizeUserManagement = () => {
  const { user } = useSupabaseAuth();
  
  // Check if user is super admin via database instead of hardcoded email
  const { data: isSuperAdmin, isLoading } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .rpc('is_super_admin', { check_user_id: user.id });
      
      if (error) {
        console.error('Error checking super admin status:', error);
        return false;
      }
      
      return data;
    },
    enabled: !!user?.id
  });
  
  const isAuthorized = isSuperAdmin || false;
  
  return {
    isAuthorized,
    canManageUsers: isAuthorized,
    isLoading
  };
};