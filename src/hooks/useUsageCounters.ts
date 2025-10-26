import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveEventConfig } from './useEventConfig';
import { useControlTypes } from './useSupabaseData';

export const useUsageCounters = () => {
  const { data: event } = useActiveEventConfig();
  const { data: controlTypes = [] } = useControlTypes();
  const controlTypeIds = controlTypes.map((ct) => ct.id).filter(Boolean) as string[];

  const totalUsagesQuery = useQuery({
    queryKey: ['usage_total_count', event?.id, controlTypeIds],
    enabled: !!event?.id && controlTypeIds.length > 0,
    refetchInterval: 5000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('control_usage')
        .select('*', { count: 'exact', head: true })
        .in('control_type_id', controlTypeIds);
      if (error) throw error;
      return count || 0;
    },
  });

  const uniqueAttendeesQuery = useQuery({
    queryKey: ['usage_unique_attendees_count', event?.id, controlTypeIds],
    enabled: !!event?.id && controlTypeIds.length > 0,
    refetchInterval: 10000,
    queryFn: async () => {
      const pageSize = 1000;
      let from = 0;
      const unique = new Set<string>();
      // Paginamos y contamos attendees únicos del evento activo
      while (true) {
        const { data, error } = await supabase
          .from('control_usage')
          .select('attendee_id')
          .in('control_type_id', controlTypeIds)
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
