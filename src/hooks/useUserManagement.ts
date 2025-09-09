import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'control' | 'attendee' | 'viewer';
  attendee_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useUserManagement = () => {
  const queryClient = useQueryClient();

  // Obtener todos los usuarios
  const useUsers = () => {
    return useQuery({
      queryKey: ['users'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data as UserProfile[];
      }
    });
  };

  // Crear nuevo usuario
  const useCreateUser = () => {
    return useMutation({
      mutationFn: async ({ email, password, full_name, role }: {
        email: string;
        password: string;
        full_name: string;
        role: 'admin' | 'control' | 'attendee' | 'viewer';
      }) => {
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: { email, password, full_name, role }
        });

        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        toast.success('Usuario creado exitosamente');
      },
      onError: (error: any) => {
        toast.error('Error al crear usuario: ' + error.message);
      }
    });
  };

  // Actualizar usuario
  const useUpdateUser = () => {
    return useMutation({
      mutationFn: async ({ 
        userId, 
        updates 
      }: { 
        userId: string; 
        updates: Partial<Pick<UserProfile, 'full_name' | 'role' | 'attendee_id'>>
      }) => {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (error) throw error;
        return updates;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        toast.success('Usuario actualizado exitosamente');
      },
      onError: (error: any) => {
        toast.error('Error al actualizar usuario: ' + error.message);
      }
    });
  };

  // Eliminar usuario
  const useDeleteUser = () => {
    return useMutation({
      mutationFn: async (userId: string) => {
        const { data, error } = await supabase.functions.invoke('delete-user', {
          body: { userId }
        });

        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        toast.success('Usuario eliminado exitosamente');
      },
      onError: (error: any) => {
        toast.error('Error al eliminar usuario: ' + error.message);
      }
    });
  };

  return {
    useUsers,
    useCreateUser,
    useUpdateUser,
    useDeleteUser
  };
};