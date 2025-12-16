
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Attendee, ControlType, TicketCategory, ControlUsage, CategoryControl } from '@/types/database';
import { useEventContext } from '@/context/EventContext';

export const useAttendees = () => {
  const queryClient = useQueryClient();
  const { selectedEvent } = useEventContext();

  const query = useQuery({
    queryKey: ['attendees', selectedEvent?.id],
    queryFn: async () => {
      if (!selectedEvent?.id) return [];
      
      const { data, error } = await supabase
        .from('attendees')
        .select(`
          id,
          name,
          cedula,
          ticket_id,
          category_id,
          event_id,
          qr_code,
          status,
          created_at,
          updated_at,
          ticket_category:ticket_categories(*)
        `)
        .eq('event_id', selectedEvent.id);
      
      if (error) throw error;
      return data as (Attendee & { ticket_category: TicketCategory })[];
    },
    enabled: !!selectedEvent?.id
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendees'
        },
        (payload) => {
          console.log('Attendees real-time update:', payload);
          queryClient.invalidateQueries({ queryKey: ['attendees'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

export const useControlTypes = () => {
  const { selectedEvent } = useEventContext();
  
  return useQuery({
    queryKey: ['control_types', selectedEvent?.id],
    queryFn: async () => {
      if (!selectedEvent?.id) return [];
      
      const { data, error } = await supabase
        .from('control_types')
        .select('*')
        .eq('event_id', selectedEvent.id);
      
      if (error) throw error;
      return data as ControlType[];
    },
    enabled: !!selectedEvent?.id
  });
};

export const useTicketCategories = () => {
  const { selectedEvent } = useEventContext();
  
  return useQuery({
    queryKey: ['ticket_categories', selectedEvent?.id],
    queryFn: async () => {
      if (!selectedEvent?.id) return [];
      
      const { data, error } = await supabase
        .from('ticket_categories')
        .select('*')
        .eq('event_id', selectedEvent.id);
      
      if (error) throw error;
      return data as TicketCategory[];
    },
    enabled: !!selectedEvent?.id
  });
};

export const useControlUsage = () => {
  const { selectedEvent } = useEventContext();
  
  return useQuery({
    queryKey: ['control_usage', selectedEvent?.id],
    queryFn: async () => {
      if (!selectedEvent?.id) return [];
      
      const { data, error } = await supabase
        .from('control_usage')
        .select(`
          *,
          control_type:control_types(*),
          attendee:attendees!inner(
            *,
            ticket_category:ticket_categories(*)
          )
        `)
        .eq('attendee.event_id', selectedEvent.id)
        .order('used_at', { ascending: false });
      
      if (error) throw error;
      return data as (ControlUsage & { 
        control_type: ControlType;
        attendee: Attendee & { ticket_category: TicketCategory };
      })[];
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    enabled: !!selectedEvent?.id
  });
};

export const useCategoryControls = () => {
  const { selectedEvent } = useEventContext();
  
  return useQuery({
    queryKey: ['category_controls', selectedEvent?.id],
    queryFn: async () => {
      if (!selectedEvent?.id) return [];
      
      const { data, error } = await supabase
        .from('category_controls')
        .select(`
          *,
          control_type:control_types!inner(*),
          ticket_category:ticket_categories!inner(*)
        `)
        .eq('control_type.event_id', selectedEvent.id)
        .eq('ticket_category.event_id', selectedEvent.id);
      
      if (error) throw error;
      return data as (CategoryControl & {
        control_type: ControlType;
        ticket_category: TicketCategory;
      })[];
    },
    enabled: !!selectedEvent?.id
  });
};

export const useProcessQRCode = () => {
  const queryClient = useQueryClient();
  const { selectedEvent } = useEventContext();
  
  return useMutation({
    mutationFn: async ({ ticketId, controlType, eventId }: { ticketId: string; controlType: string; eventId?: string }) => {
      const cleanTicketId = ticketId.trim();
      const targetEventId = eventId || selectedEvent?.id;
      
      console.log('=== PROCESANDO QR CODE MEDIANTE EDGE FUNCTION SEGURA ===');
      console.log('ProcessQRCode - Ticket ID:', cleanTicketId);
      console.log('ProcessQRCode - Control type:', controlType);
      console.log('ProcessQRCode - Event ID:', targetEventId);
      
      const { data, error } = await supabase.functions.invoke('process-qr-scan', {
        body: {
          ticketId: cleanTicketId,
          controlTypeId: controlType,
          eventId: targetEventId,
          device: `Scanner Web - ${navigator.userAgent?.split(' ')[0] || 'Unknown'}`
        }
      });

      if (error) {
        console.error('❌ Edge Function error:', error);
        throw new Error('Error al procesar el escaneado: ' + error.message);
      }

      // Normalizar respuesta tanto para permitido como denegado
      const normalized = {
        attendee: data?.attendee,
        usage: data?.usage,
        message: data?.message || data?.error,
        canAccess: Boolean(data?.canAccess ?? data?.success),
        lastUsage: data?.lastUsage || null,
      } as {
        attendee: any;
        usage: any;
        message?: string;
        canAccess: boolean;
        lastUsage?: { used_at?: string; device?: string; control_type?: string } | null;
      };

      console.log('🔎 Respuesta normalizada del scanner:', normalized);
      return normalized;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['control_usage'] });
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
    }
  });
};

export const useResetControlUsage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendeeId: string | null) => {
      if (attendeeId) {
        // Reset usage for specific attendee
        const { error } = await supabase
          .from('control_usage')
          .delete()
          .eq('attendee_id', attendeeId);

        if (error) {
          throw new Error('Error al resetear las entradas del asistente');
        }
      } else {
        // Reset all usage
        const { error } = await supabase
          .from('control_usage')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

        if (error) {
          throw new Error('Error al resetear todas las entradas');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control_usage'] });
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
    }
  });
};
