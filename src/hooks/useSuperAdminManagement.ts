import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SuperAdmin {
  id: string;
  user_id: string;
  email: string;
  granted_by: string | null;
  granted_at: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useSuperAdminManagement = () => {
  const queryClient = useQueryClient();

  // Get all super admins
  const useSuperAdmins = () => {
    return useQuery({
      queryKey: ['super-admins'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('super_admins')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data as SuperAdmin[];
      }
    });
  };

  // Grant super admin access
  const useGrantSuperAdmin = () => {
    return useMutation({
      mutationFn: async ({ 
        userId, 
        email, 
        notes 
      }: { 
        userId: string; 
        email: string; 
        notes?: string; 
      }) => {
        const { data, error } = await supabase
          .from('super_admins')
          .insert({
            user_id: userId,
            email,
            notes,
            granted_by: (await supabase.auth.getUser()).data.user?.id
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['super-admins'] });
        toast.success('Super admin access granted successfully');
      },
      onError: (error: any) => {
        toast.error('Error granting super admin access: ' + error.message);
      }
    });
  };

  // Revoke super admin access
  const useRevokeSuperAdmin = () => {
    return useMutation({
      mutationFn: async (userId: string) => {
        const { error } = await supabase
          .from('super_admins')
          .update({ is_active: false })
          .eq('user_id', userId);

        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['super-admins'] });
        toast.success('Super admin access revoked successfully');
      },
      onError: (error: any) => {
        toast.error('Error revoking super admin access: ' + error.message);
      }
    });
  };

  // Restore super admin access
  const useRestoreSuperAdmin = () => {
    return useMutation({
      mutationFn: async (userId: string) => {
        const { error } = await supabase
          .from('super_admins')
          .update({ is_active: true })
          .eq('user_id', userId);

        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['super-admins'] });
        toast.success('Super admin access restored successfully');
      },
      onError: (error: any) => {
        toast.error('Error restoring super admin access: ' + error.message);
      }
    });
  };

  return {
    useSuperAdmins,
    useGrantSuperAdmin,
    useRevokeSuperAdmin,
    useRestoreSuperAdmin
  };
};