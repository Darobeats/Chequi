import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { toast } from 'sonner';

export interface UserEventAssignment {
  id: string;
  user_id: string;
  event_id: string;
  role_in_event: 'admin' | 'control' | 'scanner';
  is_primary: boolean;
  assigned_at: string;
  assigned_by: string | null;
}

export interface EventTeamMember {
  id: string;
  user_id: string;
  event_id: string;
  role_in_event: 'admin' | 'control' | 'scanner';
  is_primary: boolean;
  assigned_at: string;
  email?: string;
  full_name?: string;
}

// Get all team members for an event
export function useEventTeamMembers(eventId: string | null) {
  return useQuery({
    queryKey: ['event_team_members', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from('user_event_assignments')
        .select(`
          id,
          user_id,
          event_id,
          role_in_event,
          is_primary,
          assigned_at,
          assigned_by
        `)
        .eq('event_id', eventId)
        .order('assigned_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch user profiles for each team member
      const userIds = data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(member => ({
        ...member,
        email: profileMap.get(member.user_id)?.email,
        full_name: profileMap.get(member.user_id)?.full_name,
      })) as EventTeamMember[];
    },
    enabled: !!eventId,
  });
}

// Add a user to an event
export function useAddUserToEvent() {
  const queryClient = useQueryClient();
  const { user } = useSupabaseAuth();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      eventId, 
      roleInEvent,
      isPrimary = false 
    }: { 
      userId: string; 
      eventId: string; 
      roleInEvent: 'admin' | 'control' | 'scanner';
      isPrimary?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('user_event_assignments')
        .insert({
          user_id: userId,
          event_id: eventId,
          role_in_event: roleInEvent,
          is_primary: isPrimary,
          assigned_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['event_team_members', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['user_events'] });
      toast.success('Usuario asignado al evento correctamente');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Este usuario ya está asignado a este evento');
      } else {
        toast.error('Error al asignar usuario: ' + error.message);
      }
    },
  });
}

// Update a user's role in an event
export function useUpdateUserEventRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      assignmentId, 
      roleInEvent,
      isPrimary 
    }: { 
      assignmentId: string; 
      roleInEvent?: 'admin' | 'control' | 'scanner';
      isPrimary?: boolean;
    }) => {
      const updateData: any = {};
      if (roleInEvent !== undefined) updateData.role_in_event = roleInEvent;
      if (isPrimary !== undefined) updateData.is_primary = isPrimary;
      
      const { data, error } = await supabase
        .from('user_event_assignments')
        .update(updateData)
        .eq('id', assignmentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event_team_members', data.event_id] });
      queryClient.invalidateQueries({ queryKey: ['user_events'] });
      toast.success('Rol actualizado correctamente');
    },
    onError: (error: any) => {
      toast.error('Error al actualizar rol: ' + error.message);
    },
  });
}

// Remove a user from an event
export function useRemoveUserFromEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ assignmentId, eventId }: { assignmentId: string; eventId: string }) => {
      const { error } = await supabase
        .from('user_event_assignments')
        .delete()
        .eq('id', assignmentId);
      
      if (error) throw error;
      return { assignmentId, eventId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event_team_members', data.eventId] });
      queryClient.invalidateQueries({ queryKey: ['user_events'] });
      toast.success('Usuario removido del evento');
    },
    onError: (error: any) => {
      toast.error('Error al remover usuario: ' + error.message);
    },
  });
}

// Search users by email (for adding to events)
export function useSearchUsers(searchTerm: string) {
  return useQuery({
    queryKey: ['search_users', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 3) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .ilike('email', `%${searchTerm}%`)
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: searchTerm.length >= 3,
  });
}
