
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Attendee, ControlType, TicketCategory, ControlUsage, CategoryControl } from '@/types/database';

export const useAttendees = () => {
  return useQuery({
    queryKey: ['attendees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendees')
        .select(`
          *,
          ticket_category:ticket_categories(*)
        `);
      
      if (error) throw error;
      return data as (Attendee & { ticket_category: TicketCategory })[];
    }
  });
};

export const useControlTypes = () => {
  return useQuery({
    queryKey: ['control_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('control_types')
        .select('*');
      
      if (error) throw error;
      return data as ControlType[];
    }
  });
};

export const useTicketCategories = () => {
  return useQuery({
    queryKey: ['ticket_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_categories')
        .select('*');
      
      if (error) throw error;
      return data as TicketCategory[];
    }
  });
};

export const useControlUsage = () => {
  return useQuery({
    queryKey: ['control_usage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('control_usage')
        .select(`
          *,
          control_type:control_types(*),
          attendee:attendees(*)
        `)
        .order('used_at', { ascending: false });
      
      if (error) throw error;
      return data as (ControlUsage & { 
        control_type: ControlType;
        attendee: Attendee;
      })[];
    }
  });
};

export const useCategoryControls = () => {
  return useQuery({
    queryKey: ['category_controls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_controls')
        .select(`
          *,
          control_type:control_types(*),
          ticket_category:ticket_categories(*)
        `);
      
      if (error) throw error;
      return data as (CategoryControl & {
        control_type: ControlType;
        ticket_category: TicketCategory;
      })[];
    }
  });
};

export const useProcessQRCode = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ticketId, controlType }: { ticketId: string; controlType: string }) => {
      const cleanTicketId = ticketId.trim();
      console.log('=== PROCESANDO QR CODE ===');
      console.log('ProcessQRCode - Scanned data original:', `"${ticketId}"`);
      console.log('ProcessQRCode - Scanned data cleaned:', `"${cleanTicketId}"`);
      console.log('ProcessQRCode - Length original:', ticketId.length);
      console.log('ProcessQRCode - Length cleaned:', cleanTicketId.length);
      console.log('ProcessQRCode - Control type:', controlType);
      console.log('ProcessQRCode - First 5 chars ASCII:', [...cleanTicketId.slice(0, 5)].map(c => `${c}(${c.charCodeAt(0)})`).join(' '));
      console.log('==========================');
      
      // Buscar el asistente por QR code
      console.log('🔍 Searching by qr_code:', `"${cleanTicketId}"`);
      let { data: attendee, error: attendeeError } = await supabase
        .from('attendees')
        .select(`
          *,
          ticket_category:ticket_categories(*)
        `)
        .eq('qr_code', cleanTicketId)
        .maybeSingle();

      console.log('📊 QR Code search result:', { attendee, attendeeError });

      // Si no se encuentra por QR code, buscar por ticket_id
      if (!attendee && !attendeeError) {
        console.log('🔍 Searching by ticket_id:', `"${cleanTicketId}"`);
        const { data: attendeeByTicket, error: ticketError } = await supabase
          .from('attendees')
          .select(`
            *,
            ticket_category:ticket_categories(*)
          `)
          .eq('ticket_id', cleanTicketId)
          .maybeSingle();
        
        console.log('📊 Ticket ID search result:', { attendeeByTicket, ticketError });
        attendee = attendeeByTicket;
        attendeeError = ticketError;
      }
      
      // Búsqueda adicional con LIKE por si hay problemas de formato
      if (!attendee && !attendeeError) {
        console.log('🔍 Searching with LIKE pattern for:', `"${cleanTicketId}"`);
        const { data: attendeeWithLike, error: likeError } = await supabase
          .from('attendees')
          .select(`
            *,
            ticket_category:ticket_categories(*)
          `)
          .or(`qr_code.ilike.%${cleanTicketId}%,ticket_id.ilike.%${cleanTicketId}%`)
          .limit(1)
          .maybeSingle();
        
        console.log('📊 LIKE search result:', { attendeeWithLike, likeError });
        attendee = attendeeWithLike;
        attendeeError = likeError;
      }

      // Verificar todos los attendees para debugging
      const { data: allAttendees } = await supabase
        .from('attendees')
        .select('id, ticket_id, qr_code, name')
        .limit(5);
      
      console.log('📋 All attendees for comparison:', allAttendees);
      console.log('ProcessQRCode - Final result:', { attendee, attendeeError });

      if (attendeeError || !attendee) {
        throw new Error('Ticket no encontrado');
      }

      if (attendee.status === 'blocked') {
        throw new Error('Ticket bloqueado');
      }

      // Verificar si la categoría del ticket permite este control
      const { data: categoryControl, error: categoryError } = await supabase
        .from('category_controls')
        .select('*')
        .eq('category_id', attendee.category_id)
        .eq('control_type_id', controlType)
        .single();

      if (categoryError || !categoryControl) {
        throw new Error('Este ticket no tiene acceso a este tipo de control');
      }

      // Verificar usos previos
      const { data: previousUses, error: usageError } = await supabase
        .from('control_usage')
        .select('*')
        .eq('attendee_id', attendee.id)
        .eq('control_type_id', controlType);

      if (usageError) throw usageError;

      const usageCount = previousUses?.length || 0;
      
      // Verificar límites (si max_uses es -1, es ilimitado)
      if (categoryControl.max_uses !== -1 && usageCount >= categoryControl.max_uses) {
        throw new Error(`Límite de usos alcanzado para este control (${categoryControl.max_uses})`);
      }

      // Registrar el uso
      const { error: insertError } = await supabase
        .from('control_usage')
        .insert({
          attendee_id: attendee.id,
          control_type_id: controlType,
          device: 'Terminal-Web'
        });

      if (insertError) throw insertError;

      return { success: true, attendee, usageCount: usageCount + 1 };
    },
    onSuccess: () => {
      // Invalidar queries para actualización inmediata
      queryClient.invalidateQueries({ queryKey: ['control_usage'] });
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
      
      // Forzar refetch para actualización en tiempo real
      queryClient.refetchQueries({ queryKey: ['control_usage'] });
      queryClient.refetchQueries({ queryKey: ['attendees'] });
    }
  });
};
