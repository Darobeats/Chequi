import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useControlUsage } from './useSupabaseData';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEventContext } from '@/context/EventContext';
import { bogotaDateKey, bogotaHour } from '@/lib/timezone';

type SummaryPayload = {
  range_start: string;
  range_end: string;
  kpis: {
    total_usages: number;
    unique_attendees: number;
    total_attendees: number;
    peak_hour: string;
    peak_hour_count: number;
  };
  hourly: Array<{ hour: string; count: number }>;
  daily: Array<{ date: string; count: number }>;
  control_coverage: Array<{ id: string; name: string; color: string | null; total_usages: number; unique_users: number }>;
  category_coverage: Array<{ id: string; name: string; color: string | null; total_attendees: number; used_attendees: number }>;
  control_type_by_hour: Array<{ hour: string; control_type_id: string; control_name: string; control_color: string | null; count: number }>;
  category_by_hour: Array<{ hour: string; category_id: string; category_name: string; category_color: string | null; count: number }>;
};

type RecentActivityRow = {
  id: string;
  used_at: string;
  subject_name: string;
  category_name: string | null;
  category_color: string | null;
  control_name: string | null;
  control_color: string | null;
  device: string | null;
  notes: string | null;
  source: 'qr' | 'cedula';
};

export const useAdvancedAnalytics = (filters: {
  controlType: string;
  category: string;
  timeRange: string;
}) => {
  const { selectedEvent } = useEventContext();
  const eventId = selectedEvent?.id || null;
  const queryClient = useQueryClient();

  const controlTypeParam = filters.controlType === 'all' ? null : filters.controlType;
  const categoryParam = filters.category === 'all' ? null : filters.category;

  // Server-side aggregated analytics (scales to 10k+ events)
  const summaryQuery = useQuery({
    queryKey: ['analytics_summary', eventId, filters.timeRange, controlTypeParam, categoryParam],
    enabled: !!eventId,
    staleTime: 5_000,
    refetchInterval: 30_000,
    queryFn: async (): Promise<SummaryPayload | null> => {
      if (!eventId) return null;
      const { data, error } = await supabase.rpc('get_event_analytics_summary', {
        p_event_id: eventId,
        p_time_range: filters.timeRange,
        p_control_type: controlTypeParam,
        p_category: categoryParam,
      });
      if (error) throw error;
      return data as SummaryPayload;
    },
  });

  const recentQuery = useQuery({
    queryKey: ['analytics_recent_activity', eventId],
    enabled: !!eventId,
    staleTime: 5_000,
    refetchInterval: 20_000,
    queryFn: async (): Promise<RecentActivityRow[]> => {
      if (!eventId) return [];
      const { data, error } = await supabase.rpc('get_event_recent_activity', {
        p_event_id: eventId,
        p_limit: 50,
      });
      if (error) throw error;
      return (data as RecentActivityRow[]) || [];
    },
  });

  // Raw usage for the "Detalles" tab (already paginated in useControlUsage)
  const { data: controlUsage = [] } = useControlUsage();

  const filteredData = useMemo(() => {
    const todayKey = bogotaDateKey(new Date());
    const yesterdayKey = bogotaDateKey(new Date(Date.now() - 86_400_000));
    return controlUsage.filter((usage: any) => {
      const usageDate = parseISO(usage.used_at);
      let timeFilter = true;
      if (filters.timeRange === 'today') {
        timeFilter = bogotaDateKey(usageDate) === todayKey;
      } else if (filters.timeRange === 'yesterday') {
        timeFilter = bogotaDateKey(usageDate) === yesterdayKey;
      } else if (filters.timeRange === 'week') {
        timeFilter = usageDate >= new Date(Date.now() - 7 * 86_400_000);
      } else if (filters.timeRange === 'month') {
        timeFilter = usageDate >= new Date(Date.now() - 30 * 86_400_000);
      }
      const controlFilter = filters.controlType === 'all' || usage.control_type_id === filters.controlType;
      const categoryFilter = filters.category === 'all' || usage.attendee?.category_id === filters.category;
      return timeFilter && controlFilter && categoryFilter;
    });
  }, [controlUsage, filters]);

  // Realtime: invalidate analytics queries on any relevant change (debounced)
  useEffect(() => {
    if (!eventId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const invalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['analytics_summary', eventId] });
        queryClient.invalidateQueries({ queryKey: ['analytics_recent_activity', eventId] });
        queryClient.invalidateQueries({ queryKey: ['control_usage', eventId] });
        queryClient.invalidateQueries({ queryKey: ['attendees', eventId] });
        queryClient.invalidateQueries({ queryKey: ['usage_total_count', eventId] });
        queryClient.invalidateQueries({ queryKey: ['usage_unique_attendees_count', eventId] });
      }, 800);
    };

    const channelName = `analytics-realtime-${eventId}-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'control_usage' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendees' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cedula_control_usage', filter: `event_id=eq.${eventId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cedula_registros', filter: `event_id=eq.${eventId}` }, invalidate)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      try { supabase.removeChannel(channel); } catch { /* noop */ }
    };
  }, [eventId, queryClient]);

  // ---------- Derive component-friendly shapes from server aggregates ----------
  const summary = summaryQuery.data;

  const enhancedMetrics = useMemo(() => {
    const totalUsages = summary?.kpis.total_usages ?? 0;
    const uniqueAttendees = summary?.kpis.unique_attendees ?? 0;
    const totalAttendees = summary?.kpis.total_attendees ?? 0;
    const participationRate = totalAttendees > 0 ? (uniqueAttendees / totalAttendees) * 100 : 0;
    const avgUsagePerAttendee = uniqueAttendees > 0 ? totalUsages / uniqueAttendees : 0;
    const controlTypeUsage = (summary?.control_coverage ?? []).map(c => ({
      name: c.name,
      usages: c.total_usages,
      color: c.color,
    }));
    const categoryEfficiency = (summary?.category_coverage ?? []).map(c => ({
      name: c.name,
      efficiency: c.total_attendees > 0 ? (c.used_attendees / c.total_attendees) * 100 : 0,
      totalAttendees: c.total_attendees,
      totalUsages: c.used_attendees,
      color: c.color,
    }));
    return {
      totalUsages,
      uniqueAttendees,
      totalAttendees,
      participationRate,
      peakHour: {
        hour: summary?.kpis.peak_hour ?? '--',
        count: summary?.kpis.peak_hour_count ?? 0,
      },
      avgUsagePerAttendee,
      controlTypeUsage,
      categoryEfficiency,
    };
  }, [summary]);

  const timeSeriesData = useMemo(() => {
    return (summary?.daily ?? []).map(d => ({
      date: d.date,
      count: d.count,
      formattedDate: format(parseISO(d.date), 'dd/MM', { locale: es }),
      isToday: isToday(parseISO(d.date)),
      isYesterday: isYesterday(parseISO(d.date)),
    }));
  }, [summary]);

  const hourlyDistribution = useMemo(() => {
    return (summary?.hourly ?? []).map(h => ({ hour: h.hour, count: h.count, usage: h.count }));
  }, [summary]);

  const coverageAnalysis = useMemo(() => {
    const controlCoverage = (summary?.control_coverage ?? []).map(c => ({
      id: c.id,
      name: c.name,
      totalUsages: c.total_usages,
      uniqueUsers: c.unique_users,
      coverage: enhancedMetrics.totalAttendees > 0 ? (c.unique_users / enhancedMetrics.totalAttendees) * 100 : 0,
      color: c.color ?? undefined,
    }));
    const categoryCoverage = (summary?.category_coverage ?? []).map(c => ({
      id: c.id,
      name: c.name,
      totalAttendees: c.total_attendees,
      usedAttendees: c.used_attendees,
      coverage: c.total_attendees > 0 ? (c.used_attendees / c.total_attendees) * 100 : 0,
      color: c.color ?? undefined,
    }));
    return { controlCoverage, categoryCoverage };
  }, [summary, enhancedMetrics.totalAttendees]);

  const recentActivity = useMemo(() => {
    return (recentQuery.data ?? []).map(r => ({
      id: r.id,
      used_at: r.used_at,
      timeAgo: format(parseISO(r.used_at), 'HH:mm', { locale: es }),
      attendeeName: r.subject_name || 'Desconocido',
      controlName: r.control_name || 'Desconocido',
      categoryName: r.category_name || 'Sin categoría',
      device: r.device ?? undefined,
      notes: r.notes ?? undefined,
      control_type: r.control_color ? { color: r.control_color } : undefined,
      attendee: r.category_color ? { ticket_category: { color: r.category_color } } : undefined,
    }));
  }, [recentQuery.data]);

  // Intraday insights derived from hourly aggregates
  const intradayInsights = useMemo(() => {
    const isSingleDay = filters.timeRange === 'today' || filters.timeRange === 'yesterday';
    const hd = hourlyDistribution;

    if (!isSingleDay || hd.length === 0) {
      return {
        isSingleDay: false,
        minuteIntervals: [] as Array<{ time: string; count: number; minute: number }>,
        cumulativeProgress: [] as Array<{ hour: string; hourly: number; cumulative: number }>,
        movingAverage: [] as Array<{ hour: string; actual: number; average: number }>,
        controlTypeByHour: [] as Array<{ hour: string; [key: string]: any }>,
        categoryHeatmap: [] as Array<{ category: string; color: string | null; data: Array<{ hour: string; count: number; intensity: number }> }>,
        peakDetection: { peaks: [] as Array<{ hour: string; count: number }>, troughs: [] as Array<{ hour: string; count: number }> },
        dailyRhythm: { current: 0, predicted: 0, eta: null as string | null },
      };
    }

    // Cumulative
    const cumulativeProgress: Array<{ hour: string; hourly: number; cumulative: number }> = [];
    let cum = 0;
    hd.forEach(h => { cum += h.count; cumulativeProgress.push({ hour: h.hour, hourly: h.count, cumulative: cum }); });

    // Moving average (3-hour window)
    const movingAverage = hd.map((curr, index) => {
      const s = Math.max(0, index - 1);
      const e = Math.min(hd.length - 1, index + 1);
      const w = hd.slice(s, e + 1);
      const avg = w.reduce((sum, i) => sum + i.count, 0) / w.length;
      return { hour: curr.hour, actual: curr.count, average: Math.round(avg * 10) / 10 };
    });

    // Control-type stacked by hour: pivot { hour, [controlName]: count }
    const controlTypeByHourMap = new Map<string, { hour: string; [key: string]: any }>();
    (summary?.control_type_by_hour ?? []).forEach(row => {
      const existing = controlTypeByHourMap.get(row.hour) || { hour: row.hour };
      existing[row.control_name] = row.count;
      controlTypeByHourMap.set(row.hour, existing);
    });
    const controlTypeByHour: Array<{ hour: string; [key: string]: any }> =
      Array.from(controlTypeByHourMap.values()).sort((a, b) => a.hour.localeCompare(b.hour));

    // Category heatmap
    const maxHourCount = Math.max(...hd.map(h => h.count), 1);
    const categoryMap = new Map<string, { color: string | null; hours: Map<string, number> }>();
    (summary?.category_by_hour ?? []).forEach(row => {
      if (!categoryMap.has(row.category_name)) {
        categoryMap.set(row.category_name, { color: row.category_color, hours: new Map() });
      }
      categoryMap.get(row.category_name)!.hours.set(row.hour, row.count);
    });
    const categoryHeatmap = Array.from(categoryMap.entries()).map(([category, info]) => ({
      category,
      color: info.color,
      data: hd.map(h => {
        const count = info.hours.get(h.hour) ?? 0;
        return { hour: h.hour, count, intensity: count / maxHourCount };
      }),
    }));

    // Peak / trough detection
    const peaks: Array<{ hour: string; count: number }> = [];
    const troughs: Array<{ hour: string; count: number }> = [];
    hd.forEach((curr, i) => {
      const prev = hd[i - 1];
      const next = hd[i + 1];
      if (prev && next) {
        if (curr.count > prev.count && curr.count > next.count) peaks.push({ hour: curr.hour, count: curr.count });
        if (curr.count < prev.count && curr.count < next.count && curr.count > 0) troughs.push({ hour: curr.hour, count: curr.count });
      }
    });
    peaks.sort((a, b) => b.count - a.count);

    // Daily rhythm + ETA (Bogotá clock)
    const total = enhancedMetrics.totalUsages;
    const currentHour = bogotaHour(new Date());
    const currentProgress = cumulativeProgress.find(p => parseInt(p.hour.split(':')[0], 10) === currentHour);
    const currentCount = currentProgress?.cumulative ?? total;
    const hoursElapsed = Math.max(1, currentHour);
    const currentPace = currentCount / hoursElapsed;
    const predictedTotal = Math.round(currentPace * 24);
    const milestones = [100, 500, 1000, 2000, 5000, 10000];
    const nextMilestone = milestones.find(m => m > currentCount);
    const eta = nextMilestone && currentPace > 0
      ? new Date(Date.now() + ((nextMilestone - currentCount) / currentPace) * 3_600_000)
      : null;

    return {
      isSingleDay: true,
      minuteIntervals: [],
      cumulativeProgress,
      movingAverage,
      controlTypeByHour,
      categoryHeatmap,
      peakDetection: { peaks, troughs },
      dailyRhythm: {
        current: currentCount,
        predicted: predictedTotal,
        eta: eta ? format(eta, 'HH:mm') : null,
      },
    };
  }, [filters.timeRange, hourlyDistribution, summary, enhancedMetrics.totalUsages]);

  return {
    filteredData,
    enhancedMetrics,
    timeSeriesData,
    hourlyDistribution,
    coverageAnalysis,
    recentActivity,
    intradayInsights,
    categoryByHour: summary?.category_by_hour ?? [],
    isLoading: summaryQuery.isLoading || recentQuery.isLoading,
    isError: summaryQuery.isError || recentQuery.isError,
  };
};
