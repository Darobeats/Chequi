import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEventContext } from '@/context/EventContext';
import type { Attendee, TicketCategory } from '@/types/database';

export type AttendeePageRow = Attendee & { ticket_category: TicketCategory | null };

interface Params {
  page: number;
  pageSize?: number;
  search?: string;
}

/**
 * Paginated + searchable attendees fetcher. Uses server-side ilike + range so we
 * never pull the whole 8-10k dataset into memory just to show a table page.
 */
export const useAttendeesPage = ({ page, pageSize = 50, search = '' }: Params) => {
  const { selectedEvent } = useEventContext();
  const queryClient = useQueryClient();
  const term = search.trim();

  const query = useQuery({
    queryKey: ['attendees_page', selectedEvent?.id, page, pageSize, term],
    queryFn: async () => {
      if (!selectedEvent?.id) return { rows: [] as AttendeePageRow[], total: 0 };

      const from = page * pageSize;
      const to = from + pageSize - 1;

      let q = supabase
        .from('attendees')
        .select(
          `id, name, cedula, ticket_id, category_id, event_id, qr_code, status, created_at, updated_at,
           ticket_category:ticket_categories(*)`,
          { count: 'exact' },
        )
        .eq('event_id', selectedEvent.id);

      if (term.length > 0) {
        const like = `%${term.replace(/[%_]/g, (m) => `\\${m}`)}%`;
        q = q.or(
          `name.ilike.${like},cedula.ilike.${like},ticket_id.ilike.${like},qr_code.ilike.${like}`,
        );
      }

      const { data, error, count } = await q
        .order('created_at', { ascending: true })
        .range(from, to);

      if (error) throw error;
      return { rows: (data ?? []) as unknown as AttendeePageRow[], total: count ?? 0 };
    },
    enabled: !!selectedEvent?.id,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!selectedEvent?.id) return;
    const channelName = `attendees-page-${selectedEvent.id}-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendees' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['attendees_page', selectedEvent.id] });
          queryClient.invalidateQueries({ queryKey: ['attendee_counts', selectedEvent.id] });
        },
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch { /* noop */ }
    };
  }, [selectedEvent?.id, queryClient]);

  return query;
};
