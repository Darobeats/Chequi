import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Interface for control usage record
export interface CedulaControlUsage {
  id: string;
  event_id: string;
  numero_cedula: string;
  control_type_id: string;
  used_at: string;
  device: string | null;
  notes: string | null;
  scanned_by: string | null;
  created_at: string;
}

export interface InsertCedulaControlUsage {
  event_id: string;
  numero_cedula: string;
  control_type_id: string;
  device?: string;
  notes?: string;
  scanned_by?: string;
}

export interface ControlLimitResult {
  can_access: boolean;
  current_uses: number;
  max_uses: number;
  error_message: string;
}

// Fetch all control usage for an event
export function useCedulaControlUsage(eventId: string | null) {
  return useQuery({
    queryKey: ['cedulaControlUsage', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from('cedula_control_usage')
        .select('*')
        .eq('event_id', eventId)
        .order('used_at', { ascending: false });
      
      if (error) throw error;
      return data as CedulaControlUsage[];
    },
    enabled: !!eventId,
  });
}

// Check control limit for a specific cédula
export function useCheckCedulaControlLimit(eventId: string | null) {
  const queryClient = useQueryClient();
  
  return async (numeroCedula: string, controlTypeId: string): Promise<ControlLimitResult> => {
    if (!eventId) {
      return { can_access: false, current_uses: 0, max_uses: 0, error_message: 'Evento no seleccionado' };
    }

    console.log('[useCedulaControlLimit] Checking:', { eventId, numeroCedula, controlTypeId });

    // Use the database function
    const { data, error } = await supabase
      .rpc('check_cedula_control_limit', {
        p_event_id: eventId,
        p_numero_cedula: numeroCedula,
        p_control_type_id: controlTypeId,
      });

    if (error) {
      console.error('[useCedulaControlLimit] Error:', error);
      // Fallback: count usage directly if function fails
      const { count } = await supabase
        .from('cedula_control_usage')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('numero_cedula', numeroCedula)
        .eq('control_type_id', controlTypeId);
      
      console.log('[useCedulaControlLimit] Fallback count:', count);
      
      // Default behavior: allow but warn
      return {
        can_access: true,
        current_uses: count || 0,
        max_uses: 0,
        error_message: 'Sin límite configurado (usando conteo directo)',
      };
    }

    console.log('[useCedulaControlLimit] Result:', data);
    
    if (data && data.length > 0) {
      return {
        can_access: data[0].can_access,
        current_uses: Number(data[0].current_uses),
        max_uses: data[0].max_uses,
        error_message: data[0].error_message,
      };
    }

    return { can_access: true, current_uses: 0, max_uses: 0, error_message: 'Sin límite configurado' };
  };
}

// Create a new control usage record
export function useCreateCedulaControlUsage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (usage: InsertCedulaControlUsage) => {
      console.log('[useCreateCedulaControlUsage] Creating:', usage);
      
      const { data, error } = await supabase
        .from('cedula_control_usage')
        .insert([usage])
        .select()
        .single();
      
      if (error) {
        console.error('[useCreateCedulaControlUsage] Error:', error);
        throw error;
      }
      
      console.log('[useCreateCedulaControlUsage] Created:', data);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cedulaControlUsage', variables.event_id] });
      queryClient.invalidateQueries({ queryKey: ['cedulaControlStats'] });
    },
    onError: (error) => {
      console.error('[useCreateCedulaControlUsage] Mutation error:', error);
      toast.error('Error al registrar uso de control');
    },
  });
}

// Get usage statistics for dashboard
export function useCedulaControlStats(eventId: string | null, controlTypeId?: string) {
  return useQuery({
    queryKey: ['cedulaControlStats', eventId, controlTypeId],
    queryFn: async () => {
      if (!eventId) return { total: 0, today: 0, byControl: [] };
      
      let query = supabase
        .from('cedula_control_usage')
        .select('control_type_id, used_at')
        .eq('event_id', eventId);
      
      if (controlTypeId && controlTypeId !== 'all') {
        query = query.eq('control_type_id', controlTypeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const today = new Date().toISOString().split('T')[0];
      const todayUsage = (data || []).filter(u => u.used_at.startsWith(today));
      
      // Group by control type
      const byControl = (data || []).reduce((acc: Record<string, number>, usage) => {
        acc[usage.control_type_id] = (acc[usage.control_type_id] || 0) + 1;
        return acc;
      }, {});
      
      return {
        total: data?.length || 0,
        today: todayUsage.length,
        byControl: Object.entries(byControl).map(([id, count]) => ({ controlTypeId: id, count })),
      };
    },
    enabled: !!eventId,
    refetchInterval: 10000, // Refresh every 10 seconds for live updates
  });
}
