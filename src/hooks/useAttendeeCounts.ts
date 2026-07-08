import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEventContext } from '@/context/EventContext';

/**
 * Lightweight counters via RPC — avoids downloading 8-10k rows just to show
 * "X / Y registros" in the header.
 */
export const useAttendeeCounts = () => {
  const { selectedEvent } = useEventContext();

  return useQuery({
    queryKey: ['attendee_counts', selectedEvent?.id],
    queryFn: async () => {
      if (!selectedEvent?.id) return { total: 0, withUsage: 0 };
      const { data, error } = await supabase.rpc('get_event_attendee_counts', {
        p_event_id: selectedEvent.id,
      });
      if (error) throw error;
      const row = (data as any[])?.[0];
      return {
        total: Number(row?.total_attendees ?? 0),
        withUsage: Number(row?.attendees_with_usage ?? 0),
      };
    },
    enabled: !!selectedEvent?.id,
    staleTime: 30_000,
  });
};
