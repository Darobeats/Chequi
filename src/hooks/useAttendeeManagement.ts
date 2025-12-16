
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Attendee } from '@/types/database';
import { useEventContext } from '@/context/EventContext';

export const useCreateAttendee = () => {
  const queryClient = useQueryClient();
  const { selectedEvent } = useEventContext();
  
  return useMutation({
    mutationFn: async (attendeeData: {
      name: string;
      cedula?: string | null;
      category_id: string;
      ticket_id: string;
    }) => {
      const eventId = selectedEvent?.id;
      if (!eventId) throw new Error('No hay evento seleccionado');

      const { data, error } = await supabase
        .from('attendees')
        .insert({ ...attendeeData, event_id: eventId })
        .select(`
          *,
          ticket_category:ticket_categories(*)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
    }
  });
};

export const useUpdateAttendee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Attendee> & { id: string }) => {
      const { data, error } = await supabase
        .from('attendees')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          ticket_category:ticket_categories(*)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
    }
  });
};

export const useDeleteAttendee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attendeeId: string) => {
      try {
        // First delete related control_usage records
        const { error: usageError } = await supabase
          .from('control_usage')
          .delete()
          .eq('attendee_id', attendeeId);

        if (usageError) {
          console.error('Error deleting control usage:', usageError);
          throw usageError;
        }

        // Then delete the attendee
        const { error } = await supabase
          .from('attendees')
          .delete()
          .eq('id', attendeeId);

        if (error) {
          console.error('Error deleting attendee:', error);
          throw error;
        }
      } catch (error) {
        console.error('Delete attendee error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
      queryClient.invalidateQueries({ queryKey: ['control_usage'] });
    }
  });
};

export const useBulkCreateAttendees = () => {
  const queryClient = useQueryClient();
  const { selectedEvent } = useEventContext();
  
  return useMutation({
    mutationFn: async ({ attendees, eventId }: {
      attendees: Array<{
        name: string;
        cedula?: string | null;
        category_id: string;
        ticket_id: string;
        event_id?: string;
      }>;
      eventId?: string;
    }) => {
      // Use provided eventId or get from context
      const targetEventId = eventId || selectedEvent?.id;
      if (!targetEventId) throw new Error('No hay evento seleccionado');

      // Add event_id to all attendees
      const attendeesWithEvent = attendees.map(attendee => ({
        ...attendee,
        event_id: targetEventId
      }));

      const { data, error } = await supabase
        .from('attendees')
        .insert(attendeesWithEvent)
        .select(`
          *,
          ticket_category:ticket_categories(*)
        `);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
    }
  });
};

export const useUpsertAttendees = () => {
  const queryClient = useQueryClient();
  const { selectedEvent } = useEventContext();
  
  return useMutation({
    mutationFn: async ({ attendees, eventId }: {
      attendees: Array<{
        name?: string;
        cedula?: string | null;
        category_id?: string;
        ticket_id: string;
        event_id?: string;
      }>;
      eventId?: string;
    }) => {
      // Use provided eventId or get from context
      const targetEventId = eventId || selectedEvent?.id;
      if (!targetEventId) throw new Error('No hay evento seleccionado');
      
      // Fallback per-row update-then-insert (upsert doesn't work well with optional fields)
      const results: Attendee[] = [];
      for (const rec of attendees) {
        const recWithEvent = { ...rec, event_id: targetEventId };
        
        // Build update payload with only provided fields
        const updatePayload: any = {};
        if (rec.name !== undefined && rec.name.trim()) updatePayload.name = rec.name.trim();
        if (rec.cedula !== undefined) updatePayload.cedula = rec.cedula;
        if (rec.category_id) updatePayload.category_id = rec.category_id;
        
        // Try to update existing record
        const { data: updated, error: updateErr } = await supabase
          .from('attendees')
          .update(updatePayload)
          .eq('ticket_id', rec.ticket_id)
          .eq('event_id', targetEventId)
          .select(`*, ticket_category:ticket_categories(*)`)
          .maybeSingle();
        
        if (updateErr) throw updateErr;
        
        if (updated) {
          results.push(updated as Attendee);
          continue;
        }
        
        // Insert new record - must have name and category_id
        if (!rec.name || !rec.name.trim()) {
          throw new Error(`No se puede crear un nuevo asistente sin nombre para ticket_id: ${rec.ticket_id}`);
        }
        if (!rec.category_id) {
          throw new Error(`No se puede crear un nuevo asistente sin categoría para ticket_id: ${rec.ticket_id}`);
        }
        
        const insertData = {
          name: rec.name,
          ticket_id: rec.ticket_id,
          category_id: rec.category_id,
          event_id: targetEventId,
          cedula: rec.cedula || null
        };
        
        const { data: inserted, error: insertErr } = await supabase
          .from('attendees')
          .insert(insertData)
          .select(`*, ticket_category:ticket_categories(*)`)
          .single();
        
        if (insertErr) throw insertErr;
        results.push(inserted as Attendee);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
    },
  });
};

export const useRegenerateQRCode = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attendeeId: string) => {
      // Get attendee's category
      const { data: attendee, error: fetchError } = await supabase
        .from('attendees')
        .select('category_id')
        .eq('id', attendeeId)
        .single();

      if (fetchError) throw fetchError;

      // Generate new QR code
      const { data: newQRCode, error: qrError } = await supabase
        .rpc('generate_qr_code', { p_category_id: attendee.category_id });

      if (qrError) throw qrError;

      // Update attendee with new QR code
      const { data, error } = await supabase
        .from('attendees')
        .update({ qr_code: newQRCode })
        .eq('id', attendeeId)
        .select(`
          *,
          ticket_category:ticket_categories(*)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
    }
  });
};
