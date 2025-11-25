import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InsertCedulaRegistro } from '@/types/cedula';
import { toast } from 'sonner';

export function useCedulaRegistros(eventId: string | null) {
  return useQuery({
    queryKey: ['cedula_registros', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from('cedula_registros')
        .select('*')
        .eq('event_id', eventId)
        .order('scanned_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!eventId
  });
}

export function useCreateCedulaRegistro() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertCedulaRegistro) => {
      const { data: result, error } = await supabase
        .from('cedula_registros')
        .upsert(data, { onConflict: 'event_id,numero_cedula' })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['cedula_registros', variables.event_id] 
      });
      toast.success('Registro guardado correctamente');
    },
    onError: (error: any) => {
      toast.error('Error al guardar el registro: ' + error.message);
    }
  });
}

export function useCedulaStats(eventId: string | null) {
  return useQuery({
    queryKey: ['cedula_stats', eventId],
    queryFn: async () => {
      if (!eventId) return { total: 0, today: 0 };
      
      const { count: total } = await supabase
        .from('cedula_registros')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);
      
      const today = new Date().toISOString().split('T')[0];
      const { count: todayCount } = await supabase
        .from('cedula_registros')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .gte('scanned_at', today);
      
      return {
        total: total || 0,
        today: todayCount || 0
      };
    },
    enabled: !!eventId
  });
}
