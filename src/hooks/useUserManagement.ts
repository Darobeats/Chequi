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

  // Obtener todos los usuarios con sus roles
  const useUsers = () => {
    return useQuery({
      queryKey: ['users'],
      queryFn: async () => {
        // Fetch all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (profilesError) throw profilesError;
        if (!profiles) return [];

        // Fetch all user roles
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');
        
        if (rolesError) throw rolesError;

        // Map roles to users
        const usersWithRoles = profiles.map(profile => {
          const roleData = userRoles?.find(r => r.user_id === profile.id);
          return {
            ...profile,
            role: roleData?.role || 'attendee'
          } as UserProfile;
        });

        return usersWithRoles;
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
        const { role, ...profileUpdates } = updates;

        // Update profile fields (excluding role)
        if (Object.keys(profileUpdates).length > 0) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdates)
            .eq('id', userId);

          if (profileError) throw profileError;
        }

        // Update role in user_roles table if role is being changed
        if (role) {
          // First, check if user already has a role entry
          const { data: existingRole } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          if (existingRole) {
            // Update existing role
            const { error: roleError } = await supabase
              .from('user_roles')
              .update({ role })
              .eq('user_id', userId);

            if (roleError) throw roleError;
          } else {
            // Insert new role
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert({ user_id: userId, role });

            if (roleError) throw roleError;
          }
        }

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