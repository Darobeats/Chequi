
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Attendee } from '@/types/database';

export const useCreateAttendee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attendeeData: {
      name: string;
      email?: string;
      cedula?: string | null;
      category_id: string;
      ticket_id: string;
    }) => {
      // Get active event ID
      const { data: eventId, error: eventError } = await supabase
        .rpc('get_active_event_id');
      
      if (eventError) throw eventError;
      if (!eventId) throw new Error('No hay evento activo');

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
  
  return useMutation({
    mutationFn: async (attendeesData: Array<{
      name: string;
      email?: string;
      cedula?: string | null;
      category_id: string;
      ticket_id: string;
    }>) => {
      // Get active event ID
      const { data: eventId, error: eventError } = await supabase
        .rpc('get_active_event_id');
      
      if (eventError) throw eventError;
      if (!eventId) throw new Error('No hay evento activo');

      // Add event_id to all attendees
      const attendeesWithEvent = attendeesData.map(attendee => ({
        ...attendee,
        event_id: eventId
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
  return useMutation({
    mutationFn: async (attendeesData: Array<{
      name: string;
      email?: string;
      cedula?: string | null;
      category_id: string;
      ticket_id: string;
    }>) => {
      const { data: eventId, error: eventError } = await supabase.rpc('get_active_event_id');
      if (eventError) throw eventError;
      if (!eventId) throw new Error('No hay evento activo');
      const attendeesWithEvent = attendeesData.map((a) => ({ ...a, event_id: eventId }));
      // Try upsert by ticket_id
      const { data, error } = await supabase
        .from('attendees')
        .upsert(attendeesWithEvent, { onConflict: 'ticket_id' })
        .select(`*, ticket_category:ticket_categories(*)`);
      if (!error) return data as Attendee[];
      // Fallback per-row update-then-insert
      const results: Attendee[] = [];
      for (const rec of attendeesWithEvent) {
        const { data: updated, error: updateErr } = await supabase
          .from('attendees')
          .update({ name: rec.name, email: rec.email, cedula: rec.cedula, category_id: rec.category_id })
          .eq('ticket_id', rec.ticket_id)
          .eq('event_id', eventId)
          .select(`*, ticket_category:ticket_categories(*)`)
          .maybeSingle();
        if (updateErr) throw updateErr;
        if (updated) {
          results.push(updated as Attendee);
          continue;
        }
        const { data: inserted, error: insertErr } = await supabase
          .from('attendees')
          .insert(rec)
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
