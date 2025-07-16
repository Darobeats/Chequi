
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
      console.log('ProcessQRCode - Scanned data:', ticketId);
      console.log('ProcessQRCode - Control type:', controlType);
      
      // Buscar el asistente por QR code
      const { data: attendee, error: attendeeError } = await supabase
        .from('attendees')
        .select(`
          *,
          ticket_category:ticket_categories(*)
        `)
        .eq('qr_code', ticketId)
        .single();

      console.log('ProcessQRCode - Query result:', { attendee, attendeeError });

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
      queryClient.invalidateQueries({ queryKey: ['control_usage'] });
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
    }
  });
};
