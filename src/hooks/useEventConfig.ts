
import { useState, useEffect } from 'react';
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
    }
  });
};

export const useCreateEventConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (config: Omit<EventConfig, 'id' | 'created_at' | 'updated_at'>) => {
      // First deactivate all other configs
      await supabase
        .from('event_configs')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      const { error } = await supabase
        .from('event_configs')
        .insert(config);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event_configs'] });
      queryClient.invalidateQueries({ queryKey: ['active_event_config'] });
    }
  });
};

export const useActivateEventConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (configId: string) => {
      // First deactivate all configs
      await supabase
        .from('event_configs')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // Then activate the selected one
      const { error } = await supabase
        .from('event_configs')
        .update({ is_active: true })
        .eq('id', configId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event_configs'] });
      queryClient.invalidateQueries({ queryKey: ['active_event_config'] });
    }
  });
};
