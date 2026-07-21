import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EventSummary {
  event_id: string;
  start_date: string | null;
  end_date: string | null;
  kpis: {
    total_tickets: number;
    unique_attendees: number;
    total_scans: number;
    attendance_rate: number;
    avg_scans_per_attendee: number;
    peak_hour: string;
    peak_hour_count: number;
    best_day: string | null;
    best_day_count: number;
  };
  daily: Array<{
    day: string;
    scans: number;
    unique_subjects: number;
    peak_hour: string | null;
    peak_count: number | null;
  }>;
  by_category: Array<{ id: string; name: string; color: string | null; issued: number; attended: number; uses: number }>;
  by_control: Array<{ id: string; name: string; color: string | null; uses: number; unique_users: number }>;
  hourly_by_day: Array<{ day: string; hour: string; cnt: number }>;
  cedula: { authorized: number; registered: number; scans: number };
}

export function useEventSummary(eventId: string | null | undefined) {
  return useQuery({
    queryKey: ['event_summary_report', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_event_summary_report' as any, { p_event_id: eventId });
      if (error) throw error;
      return data as unknown as EventSummary;
    },
  });
}
