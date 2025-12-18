import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CedulaRegistro, InsertCedulaRegistro } from '@/types/cedula';
import { toast } from 'sonner';

// Helper para paginación automática (superar límite de 1000 filas de Supabase)
async function fetchAllPaginated<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const allData: T[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await fetchPage(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    
    allData.push(...data);
    hasMore = data.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  return allData;
}

export function useCedulaRegistros(eventId: string | null) {
  return useQuery({
    queryKey: ['cedula_registros', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      return fetchAllPaginated<CedulaRegistro>((from, to) =>
        supabase
          .from('cedula_registros')
          .select('*')
          .eq('event_id', eventId)
          .order('scanned_at', { ascending: false })
          .range(from, to) as PromiseLike<{ data: CedulaRegistro[] | null; error: any }>
      );
    },
    enabled: !!eventId,
    staleTime: 0,
    refetchOnMount: 'always',
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

export function useDeleteCedulaRegistro() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
      const { error } = await supabase
        .from('cedula_registros')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, eventId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['cedula_registros', data.eventId] 
      });
      toast.success('Registro eliminado correctamente');
    },
    onError: (error: any) => {
      toast.error('Error al eliminar: ' + error.message);
    }
  });
}

export function useCheckCedulaDuplicate(eventId: string | null) {
  const queryClient = useQueryClient();
  
  return async (numeroCedula: string): Promise<boolean> => {
    if (!eventId || !numeroCedula) return false;
    
    const registros = queryClient.getQueryData<any[]>(['cedula_registros', eventId]);
    if (registros) {
      return registros.some(r => r.numero_cedula === numeroCedula);
    }
    
    const { data } = await supabase
      .from('cedula_registros')
      .select('id')
      .eq('event_id', eventId)
      .eq('numero_cedula', numeroCedula)
      .maybeSingle();
    
    return !!data;
  };
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
