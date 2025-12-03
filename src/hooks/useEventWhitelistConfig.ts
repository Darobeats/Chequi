import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WhitelistConfig {
  eventId: string;
  requireWhitelist: boolean;
}

// Obtener configuración de lista blanca del evento activo
export function useEventWhitelistConfig() {
  return useQuery({
    queryKey: ['eventWhitelistConfig'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_configs')
        .select('id, require_whitelist')
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      
      return data ? {
        eventId: data.id,
        requireWhitelist: data.require_whitelist ?? false,
      } : null;
    },
  });
}

// Obtener configuración de lista blanca por ID de evento
export function useEventWhitelistConfigById(eventId: string | null) {
  return useQuery({
    queryKey: ['eventWhitelistConfig', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      
      const { data, error } = await supabase
        .from('event_configs')
        .select('id, require_whitelist')
        .eq('id', eventId)
        .maybeSingle();
      
      if (error) throw error;
      
      return data ? {
        eventId: data.id,
        requireWhitelist: data.require_whitelist ?? false,
      } : null;
    },
    enabled: !!eventId,
  });
}

// Actualizar configuración de lista blanca
export function useUpdateWhitelistConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ eventId, requireWhitelist }: WhitelistConfig) => {
      const { data, error } = await supabase
        .from('event_configs')
        .update({ require_whitelist: requireWhitelist })
        .eq('id', eventId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventWhitelistConfig'] });
      queryClient.invalidateQueries({ queryKey: ['eventWhitelistConfig', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventConfigs'] });
      queryClient.invalidateQueries({ queryKey: ['activeEventConfig'] });
      
      toast.success(
        variables.requireWhitelist 
          ? 'Lista blanca activada - Solo cédulas autorizadas podrán registrarse'
          : 'Lista blanca desactivada - Registro abierto para todos'
      );
    },
    onError: () => {
      toast.error('Error al actualizar configuración');
    },
  });
}
