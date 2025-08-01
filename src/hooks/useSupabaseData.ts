
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
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
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
      console.log('=== PROCESANDO QR CODE SIN AUTENTICACIÓN ===');
      console.log('ProcessQRCode - Ticket ID:', cleanTicketId);
      console.log('ProcessQRCode - Control type:', controlType);
      
      // 1. Usar función pública de validación de acceso
      const { data: validation, error: validationError } = await supabase
        .rpc('validate_control_access_public', {
          p_ticket_id: cleanTicketId,
          p_control_type_id: controlType
        });

      if (validationError) {
        console.error('❌ Validation error:', validationError);
        throw new Error('Error al validar acceso: ' + validationError.message);
      }

      if (!validation || validation.length === 0) {
        console.error('❌ No validation result');
        throw new Error('Error en validación de ticket');
      }

      const validationResult = validation[0];
      console.log('📋 Validation result:', validationResult);

      if (!validationResult.can_access) {
        console.error('❌ Access denied:', validationResult.error_message);
        throw new Error(validationResult.error_message);
      }

      // 2. Obtener datos del asistente usando función pública
      const { data: attendeeData, error: attendeeError } = await supabase
        .rpc('find_attendee_by_ticket_public', { ticket_id: cleanTicketId });

      if (attendeeError || !attendeeData || attendeeData.length === 0) {
        console.error('❌ Attendee not found:', attendeeError);
        throw new Error('Datos del asistente no encontrados');
      }

      const attendee = attendeeData[0];
      console.log('✅ Found attendee:', attendee);

      // 3. Obtener información adicional de la categoría
      const { data: ticketCategory, error: categoryError } = await supabase
        .from('ticket_categories')
        .select('*')
        .eq('id', attendee.category_id)
        .single();

      if (categoryError) {
        console.warn('⚠️ Could not fetch ticket category:', categoryError);
      }

      // 4. Registrar uso (sin autenticación requerida)
      const { error: insertError } = await supabase
        .from('control_usage')
        .insert({
          attendee_id: validationResult.attendee_id,
          control_type_id: controlType,
          device: `Scanner Web - ${navigator.userAgent?.split(' ')[0] || 'Unknown'}`,
          notes: `Scanner público - Acceso sin autenticación`
        });

      if (insertError) {
        console.error('❌ Error inserting usage:', insertError);
        throw new Error('Error al registrar acceso: ' + insertError.message);
      }

      console.log('✅ Usage registered successfully');
      
      return {
        success: true,
        attendee: {
          ...attendee,
          ticket_category: ticketCategory
        },
        usageCount: validationResult.current_uses + 1,
        maxUses: validationResult.max_uses
      };
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
