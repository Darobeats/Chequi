import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPaginated } from '@/lib/fetchAllPaginated';

export type AttendeeUsage = {
  count: number;
  lastUsedAt: string | null;
  controls: string[];
};

/**
 * Devuelve un Map<attendeeId, AttendeeUsage> con los usos registrados en
 * control_usage para los asistentes del evento indicado (o todos si es null).
 * Se usa para mostrar "QR usado / no usado" en la gestión de asistentes.
 */
export function useAttendeesUsageMap(eventId: string | null) {
  return useQuery({
    queryKey: ['attendees_usage_map', eventId],
    staleTime: 15_000,
    queryFn: async () => {
      const rows = await fetchAllPaginated<{
        attendee_id: string;
        used_at: string;
        control_type_id: string;
        attendees?: { event_id: string } | null;
      }>((from, to) => {
        let q = supabase
          .from('control_usage')
          .select('attendee_id, used_at, control_type_id, attendees!inner(event_id)')
          .order('used_at', { ascending: false })
          .range(from, to);
        if (eventId) q = q.eq('attendees.event_id', eventId);
        return q as any;
      });

      const map = new Map<string, AttendeeUsage>();
      for (const r of rows) {
        const entry = map.get(r.attendee_id) || { count: 0, lastUsedAt: null, controls: [] };
        entry.count += 1;
        if (!entry.lastUsedAt || r.used_at > entry.lastUsedAt) entry.lastUsedAt = r.used_at;
        if (!entry.controls.includes(r.control_type_id)) entry.controls.push(r.control_type_id);
        map.set(r.attendee_id, entry);
      }
      return map;
    },
  });
}
