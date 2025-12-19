import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ControlType } from '@/types/database';

export const useCreateControlType = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      controlType, 
      eventId 
    }: { 
      controlType: Omit<ControlType, 'id' | 'created_at' | 'event_id'>; 
      eventId: string;
    }) => {
      if (!eventId) throw new Error('No hay evento seleccionado');

      const { data, error } = await supabase
        .from('control_types')
        .insert({ ...controlType, event_id: eventId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control_types'] });
    }
  });
};

export const useUpdateControlType = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (controlType: Partial<ControlType> & { id: string }) => {
      const { error } = await supabase
        .from('control_types')
        .update(controlType)
        .eq('id', controlType.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control_types'] });
    }
  });
};

export const useDeleteControlType = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (controlTypeId: string) => {
      const { error } = await supabase
        .from('control_types')
        .delete()
        .eq('id', controlTypeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control_types'] });
      queryClient.invalidateQueries({ queryKey: ['category_controls'] });
    }
  });
};
