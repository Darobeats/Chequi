
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EventConfig } from '@/types/database';

export const useActiveEventConfig = () => {
  return useQuery({
    queryKey: ['active_event_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_active_event_config');
      
      if (error) throw error;
      return data[0] as EventConfig | null;
    }
  });
};

export const useEventConfigs = () => {
  return useQuery({
    queryKey: ['event_configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_configs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EventConfig[];
    }
  });
};

// Alias for useEventConfigs
export const useAllEventConfigs = useEventConfigs;

export const useUpdateEventConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (config: Partial<EventConfig> & { id: string }) => {
      const { error } = await supabase
        .from('event_configs')
        .update({
          ...config,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event_configs'] });
      queryClient.invalidateQueries({ queryKey: ['active_event_config'] });
      queryClient.invalidateQueries({ queryKey: ['selected_event'] });
      queryClient.invalidateQueries({ queryKey: ['user_events'] });
    }
  });
};

export const useCreateEventConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (config: Omit<EventConfig, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('event_configs')
        .insert(config)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event_configs'] });
      queryClient.invalidateQueries({ queryKey: ['active_event_config'] });
      queryClient.invalidateQueries({ queryKey: ['user_events'] });
    }
  });
};
