import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveEventConfig } from './useEventConfig';

export const useUsageCounters = () => {
  const { data: event } = useActiveEventConfig();

  const totalUsagesQuery = useQuery({
    queryKey: ['usage_total_count', event?.id],
    enabled: !!event?.id,
    refetchInterval: 5000,
    queryFn: async () => {
      if (!event?.id) return 0;
      const { count, error } = await supabase
        .from('control_usage')
        .select('id, attendees!inner(id)', { count: 'exact', head: true })
        .eq('attendees.event_id', event.id);
      if (error) throw error;
      return count || 0;
    },
  });

  const uniqueAttendeesQuery = useQuery({
    queryKey: ['usage_unique_attendees_count', event?.id],
    enabled: !!event?.id,
    refetchInterval: 10000,
    queryFn: async () => {
      if (!event?.id) return 0;
      const pageSize = 1000;
      let from = 0;
      const unique = new Set<string>();
      // Paginamos con join a attendees y filtramos por evento activo
      while (true) {
        const { data, error } = await supabase
          .from('control_usage')
          .select('attendee_id, attendees!inner(event_id)')
          .eq('attendees.event_id', event.id)
          .not('attendee_id', 'is', null)
          .order('attendee_id', { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        for (const row of data as Array<{ attendee_id: string | null }>) {
          if (row.attendee_id) unique.add(row.attendee_id);
        }
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return unique.size;
    },
  });

  return {
    totalUsagesCount: totalUsagesQuery.data ?? 0,
    uniqueAttendeesCount: uniqueAttendeesQuery.data ?? 0,
    loading: totalUsagesQuery.isLoading || uniqueAttendeesQuery.isLoading,
    refetch: () => {
      void totalUsagesQuery.refetch();
      void uniqueAttendeesQuery.refetch();
    },
  };
};
