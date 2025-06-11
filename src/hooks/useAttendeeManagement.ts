
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Attendee } from '@/types/database';

export const useCreateAttendee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attendeeData: {
      name: string;
      email?: string;
      company?: string;
      category_id: string;
      ticket_id: string;
    }) => {
      const { data, error } = await supabase
        .from('attendees')
        .insert(attendeeData)
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
      const { error } = await supabase
        .from('attendees')
        .delete()
        .eq('id', attendeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
    }
  });
};

export const useBulkCreateAttendees = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attendeesData: Array<{
      name: string;
      email?: string;
      company?: string;
      category_id: string;
      ticket_id: string;
    }>) => {
      const { data, error } = await supabase
        .from('attendees')
        .insert(attendeesData)
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
