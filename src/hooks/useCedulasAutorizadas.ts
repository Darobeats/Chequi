import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CedulaAutorizada, InsertCedulaAutorizada, InsertCedulaAccessLog } from '@/types/cedula';

// Obtener lista de cédulas autorizadas
export function useCedulasAutorizadas(eventId: string | null) {
  return useQuery({
    queryKey: ['cedulas_autorizadas', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('cedulas_autorizadas')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CedulaAutorizada[];
    },
    enabled: !!eventId,
  });
}

// Verificar si una cédula está autorizada
export function useCheckCedulaAuthorization(eventId: string | null) {
  const queryClient = useQueryClient();
  
  return async (numeroCedula: string): Promise<CedulaAutorizada | null> => {
    if (!eventId) return null;
    
    // Primero intentar desde el cache
    const cached = queryClient.getQueryData<CedulaAutorizada[]>(['cedulas_autorizadas', eventId]);
    if (cached) {
      const found = cached.find(c => c.numero_cedula === numeroCedula);
      if (found) return found;
    }
    
    // Si no está en cache, consultar DB
    const { data, error } = await supabase
      .from('cedulas_autorizadas')
      .select('*')
      .eq('event_id', eventId)
      .eq('numero_cedula', numeroCedula)
      .maybeSingle();
    
    if (error) {
      console.error('Error verificando autorización:', error);
      return null;
    }
    
    return data as CedulaAutorizada | null;
  };
}

// Crear cédula autorizada individual
export function useCreateCedulaAutorizada() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertCedulaAutorizada) => {
      const { data: result, error } = await supabase
        .from('cedulas_autorizadas')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cedulas_autorizadas', variables.event_id] });
      toast.success('Cédula autorizada agregada');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Esta cédula ya está autorizada');
      } else {
        toast.error('Error al agregar cédula autorizada');
      }
    },
  });
}

// Crear múltiples cédulas autorizadas (importación masiva)
export function useBulkCreateCedulasAutorizadas() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ eventId, cedulas }: { eventId: string; cedulas: Omit<InsertCedulaAutorizada, 'event_id'>[] }) => {
      const dataToInsert = cedulas.map(c => ({
        ...c,
        event_id: eventId,
      }));
      
      const { data, error } = await supabase
        .from('cedulas_autorizadas')
        .upsert(dataToInsert, { 
          onConflict: 'event_id,numero_cedula',
          ignoreDuplicates: false 
        })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cedulas_autorizadas', variables.eventId] });
      toast.success(`${data.length} cédulas importadas correctamente`);
    },
    onError: () => {
      toast.error('Error en la importación masiva');
    },
  });
}

// Eliminar cédula autorizada
export function useDeleteCedulaAutorizada() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
      const { error } = await supabase
        .from('cedulas_autorizadas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, eventId };
    },
    onSuccess: (variables) => {
      queryClient.invalidateQueries({ queryKey: ['cedulas_autorizadas', variables.eventId] });
      toast.success('Cédula autorizada eliminada');
    },
    onError: () => {
      toast.error('Error al eliminar cédula autorizada');
    },
  });
}

// Eliminar todas las cédulas autorizadas de un evento
export function useClearCedulasAutorizadas() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('cedulas_autorizadas')
        .delete()
        .eq('event_id', eventId);
      
      if (error) throw error;
      return eventId;
    },
    onSuccess: (eventId) => {
      queryClient.invalidateQueries({ queryKey: ['cedulas_autorizadas', eventId] });
      toast.success('Lista de autorizados limpiada');
    },
    onError: () => {
      toast.error('Error al limpiar lista');
    },
  });
}

// ============ LOGS DE ACCESO ============

// Obtener logs de acceso
export function useCedulaAccessLogs(eventId: string | null) {
  return useQuery({
    queryKey: ['cedula_access_logs', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('cedula_access_logs')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}

// Crear log de acceso
export function useCreateAccessLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertCedulaAccessLog) => {
      const { data: result, error } = await supabase
        .from('cedula_access_logs')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cedula_access_logs', variables.event_id] });
    },
  });
}

// Estadísticas de autorizados
export function useCedulasAutorizadasStats(eventId: string | null) {
  const { data: autorizadas = [] } = useCedulasAutorizadas(eventId);
  const { data: logs = [] } = useCedulaAccessLogs(eventId);
  
  return useQuery({
    queryKey: ['cedulas_autorizadas_stats', eventId, autorizadas.length, logs.length],
    queryFn: async () => {
      if (!eventId) return null;
      
      // Obtener registros para comparar
      const { data: registros = [] } = await supabase
        .from('cedula_registros')
        .select('numero_cedula')
        .eq('event_id', eventId);
      
      const registeredCedulas = new Set(registros?.map(r => r.numero_cedula) || []);
      
      const total = autorizadas.length;
      const registered = autorizadas.filter(a => registeredCedulas.has(a.numero_cedula)).length;
      const pending = total - registered;
      const denied = logs.filter(l => l.access_result === 'denied').length;
      
      return { total, registered, pending, denied };
    },
    enabled: !!eventId,
  });
}
