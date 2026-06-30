import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useControlUsage, useAttendees, useControlTypes, useTicketCategories, useCategoryControls } from './useSupabaseData';
import { startOfHour, startOfDay, parseISO, format, isToday, isYesterday, subDays, startOfMinute, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUsageCounters } from './useUsageCounters';
import { useEventContext } from '@/context/EventContext';

export const useAdvancedAnalytics = (filters: {
  controlType: string;
  category: string;
  timeRange: string;
}) => {
  const { selectedEvent } = useEventContext();
  const eventId = selectedEvent?.id || null;
  const queryClient = useQueryClient();

  const { data: controlUsage = [] } = useControlUsage();
  const { data: attendees = [] } = useAttendees();
  const { data: controlTypes = [] } = useControlTypes();
  const { data: ticketCategories = [] } = useTicketCategories();
  const { data: categoryControls = [] } = useCategoryControls();
  const { totalUsagesCount, uniqueAttendeesCount } = useUsageCounters();

  // Cédula data sources for current event
  const { data: cedulaUsage = [] } = useQuery({
    queryKey: ['analytics_cedula_control_usage', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      if (!eventId) return [];
      const rows: any[] = [];
      const pageSize = 1000;
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from('cedula_control_usage')
          .select('id, event_id, numero_cedula, control_type_id, used_at')
          .eq('event_id', eventId)
          .order('used_at', { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < pageSize) break;
        offset += pageSize;
      }
      return rows;
    },
  });

  const { data: cedulasAutorizadas = [] } = useQuery({
    queryKey: ['analytics_cedulas_autorizadas', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      if (!eventId) return [];
      const rows: any[] = [];
      const pageSize = 1000;
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from('cedulas_autorizadas')
          .select('numero_cedula, categoria')
          .eq('event_id', eventId)
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < pageSize) break;
        offset += pageSize;
      }
      return rows;
    },
  });

  // Realtime: invalidate all analytics queries on any change
  useEffect(() => {
    if (!eventId) return;
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['control_usage', eventId] });
      queryClient.invalidateQueries({ queryKey: ['attendees', eventId] });
      queryClient.invalidateQueries({ queryKey: ['analytics_cedula_control_usage', eventId] });
      queryClient.invalidateQueries({ queryKey: ['analytics_cedulas_autorizadas', eventId] });
      queryClient.invalidateQueries({ queryKey: ['cedulaControlUsage', eventId] });
      queryClient.invalidateQueries({ queryKey: ['cedula_registros', eventId] });
      queryClient.invalidateQueries({ queryKey: ['cedula_access_logs', eventId] });
      queryClient.invalidateQueries({ queryKey: ['usage_total_count', eventId] });
      queryClient.invalidateQueries({ queryKey: ['usage_unique_attendees_count', eventId] });
    };

    const channelName = `analytics-realtime-${eventId}-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'control_usage' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendees' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cedula_control_usage', filter: `event_id=eq.${eventId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cedula_registros', filter: `event_id=eq.${eventId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cedula_access_logs', filter: `event_id=eq.${eventId}` }, invalidate)
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch { /* noop */ }
    };
  }, [eventId, queryClient]);

  // Normalize cédula usage rows to the same shape consumed downstream
  const normalizedCedulaUsage = useMemo(() => {
    if (cedulaUsage.length === 0) return [];
    // Map numero_cedula -> category_id (resolved via ticket_categories by name)
    const categoryByName = new Map<string, string>();
    ticketCategories.forEach(tc => categoryByName.set((tc.name || '').toLowerCase(), tc.id));
    const categoryByCedula = new Map<string, string | null>();
    cedulasAutorizadas.forEach((c: any) => {
      const cat = categoryByName.get((c.categoria || '').toLowerCase()) || null;
      categoryByCedula.set(c.numero_cedula, cat);
    });

    return cedulaUsage.map((u: any) => {
      const category_id = categoryByCedula.get(u.numero_cedula) || null;
      const ct = controlTypes.find(c => c.id === u.control_type_id);
      return {
        id: u.id,
        attendee_id: `cedula:${u.numero_cedula}`,
        control_type_id: u.control_type_id,
        used_at: u.used_at,
        control_type: ct || null,
        attendee: {
          id: `cedula:${u.numero_cedula}`,
          name: u.numero_cedula,
          category_id,
          ticket_category: category_id ? ticketCategories.find(tc => tc.id === category_id) : null,
        },
      } as any;
    });
  }, [cedulaUsage, cedulasAutorizadas, ticketCategories, controlTypes]);

  // Unified data source: QR + cédula
  const combinedUsage = useMemo(
    () => [...controlUsage, ...normalizedCedulaUsage],
    [controlUsage, normalizedCedulaUsage]
  );

  // Filter data based on selections (QR + cédula combined)
  const filteredData = useMemo(() => {
    return combinedUsage.filter(usage => {
      const usageDate = parseISO(usage.used_at);
      const now = new Date();
      
      // Time range filter
      let timeFilter = true;
      if (filters.timeRange === 'today') {
        timeFilter = usageDate.toDateString() === now.toDateString();
      } else if (filters.timeRange === 'yesterday') {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        timeFilter = usageDate.toDateString() === yesterday.toDateString();
      } else if (filters.timeRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        timeFilter = usageDate >= weekAgo;
      } else if (filters.timeRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        timeFilter = usageDate >= monthAgo;
      }

      // Control type filter
      const controlFilter = filters.controlType === 'all' || usage.control_type_id === filters.controlType;
      
      // Category filter
      const categoryFilter = filters.category === 'all' || usage.attendee?.category_id === filters.category;

      return timeFilter && controlFilter && categoryFilter;
    });
  }, [combinedUsage, filters]);

  // Enhanced KPIs - Main counters use ALL data (no filters), analytics use filtered data
  const enhancedMetrics = useMemo(() => {
    // Use combined data when cédula activity exists; fallback to QR counters otherwise
    const hasCedula = normalizedCedulaUsage.length > 0 || cedulasAutorizadas.length > 0;
    const uniqueFromCombined = new Set(combinedUsage.map(u => u.attendee_id).filter(Boolean)).size;
    const totalUsages = hasCedula ? combinedUsage.length : totalUsagesCount;
    const uniqueAttendees = hasCedula ? uniqueFromCombined : uniqueAttendeesCount;
    const totalAttendees = attendees.length + cedulasAutorizadas.length;
    const participationRate = totalAttendees > 0 ? (uniqueAttendees / totalAttendees) * 100 : 0;
    
    // Peak activity analysis
    const hourlyGroups: { [key: string]: number } = {};
    filteredData.forEach(usage => {
      const hour = startOfHour(parseISO(usage.used_at));
      const hourKey = format(hour, 'HH:mm');
      hourlyGroups[hourKey] = (hourlyGroups[hourKey] || 0) + 1;
    });
    
    const peakHour = Object.entries(hourlyGroups)
      .reduce((max, [hour, count]) => count > max.count ? { hour, count } : max, { hour: '--', count: 0 });

    // Average usage per attendee
    const avgUsagePerAttendee = uniqueAttendees > 0 ? totalUsages / uniqueAttendees : 0;

    // Control type distribution
    const controlTypeUsage = controlTypes.map(ct => {
      const usages = filteredData.filter(u => u.control_type_id === ct.id).length;
      return { name: ct.name, usages, color: ct.color };
    });

    // Category efficiency (usage vs capacity)
    const categoryEfficiency = ticketCategories.map(tc => {
      const categoryAttendees = attendees.filter(a => a.category_id === tc.id);
      const categoryUsages = filteredData.filter(u => u.attendee?.category_id === tc.id);
      const efficiency = categoryAttendees.length > 0 ? (categoryUsages.length / categoryAttendees.length) : 0;
      
      return {
        name: tc.name,
        efficiency: efficiency * 100,
        totalAttendees: categoryAttendees.length,
        totalUsages: categoryUsages.length,
        color: tc.color
      };
    });

    return {
      totalUsages,
      uniqueAttendees,
      totalAttendees,
      participationRate,
      peakHour,
      avgUsagePerAttendee,
      controlTypeUsage,
      categoryEfficiency
    };
  }, [totalUsagesCount, uniqueAttendeesCount, filteredData, attendees, controlTypes, ticketCategories, combinedUsage, normalizedCedulaUsage, cedulasAutorizadas]);

  // Time series data for trends
  const timeSeriesData = useMemo(() => {
    const dailyGroups: { [key: string]: number } = {};
    
    filteredData.forEach(usage => {
      const day = startOfDay(parseISO(usage.used_at));
      const dayKey = format(day, 'yyyy-MM-dd');
      dailyGroups[dayKey] = (dailyGroups[dayKey] || 0) + 1;
    });

    return Object.entries(dailyGroups)
      .map(([date, count]) => ({ 
        date, 
        count, 
        formattedDate: format(parseISO(date), 'dd/MM', { locale: es }),
        isToday: isToday(parseISO(date)),
        isYesterday: isYesterday(parseISO(date))
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  // Hourly distribution
  const hourlyDistribution = useMemo(() => {
    const hourlyGroups: { [key: string]: number } = {};
    
    filteredData.forEach(usage => {
      const hour = startOfHour(parseISO(usage.used_at));
      const hourKey = format(hour, 'HH:mm');
      hourlyGroups[hourKey] = (hourlyGroups[hourKey] || 0) + 1;
    });

    return Object.entries(hourlyGroups)
      .map(([hour, count]) => ({ hour, count, usage: count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }, [filteredData]);

  // Coverage analysis
  const coverageAnalysis = useMemo(() => {
    const hasCedula = cedulasAutorizadas.length > 0 || normalizedCedulaUsage.length > 0;
    const totalUniverse = attendees.length + cedulasAutorizadas.length;

    const controlCoverage = controlTypes.map(ct => {
      const usagesInControl = filteredData.filter(u => u.control_type_id === ct.id);
      const uniqueUsers = new Set(usagesInControl.map(u => u.attendee_id)).size;
      return {
        id: ct.id,
        name: ct.name,
        totalUsages: usagesInControl.length,
        uniqueUsers,
        coverage: totalUniverse > 0 ? (uniqueUsers / totalUniverse) * 100 : 0,
        color: ct.color
      };
    });

    let categoryCoverage;
    if (hasCedula) {
      // Build coverage from cédulas_autorizadas by categoria (free-form)
      const byCat = new Map<string, { total: number; scanned: Set<string> }>();
      cedulasAutorizadas.forEach((c: any) => {
        const key = (c.categoria && String(c.categoria).trim()) || 'General';
        if (!byCat.has(key)) byCat.set(key, { total: 0, scanned: new Set() });
        byCat.get(key)!.total += 1;
      });
      // Map scanned cédulas to their categoria
      const cedulaCategoria = new Map<string, string>();
      cedulasAutorizadas.forEach((c: any) => {
        const key = (c.categoria && String(c.categoria).trim()) || 'General';
        cedulaCategoria.set(c.numero_cedula, key);
      });
      normalizedCedulaUsage.forEach((u: any) => {
        const numero = String(u.attendee_id || '').replace(/^cedula:/, '');
        const cat = cedulaCategoria.get(numero) || 'General';
        if (!byCat.has(cat)) byCat.set(cat, { total: 0, scanned: new Set() });
        byCat.get(cat)!.scanned.add(numero);
      });
      categoryCoverage = Array.from(byCat.entries()).map(([name, v]) => ({
        id: name,
        name,
        totalAttendees: v.total,
        usedAttendees: v.scanned.size,
        coverage: v.total > 0 ? (v.scanned.size / v.total) * 100 : 0,
        color: '#6366f1'
      }));
    } else {
      categoryCoverage = ticketCategories.map(tc => {
        const categoryAttendees = attendees.filter(a => a.category_id === tc.id);
        const usedAttendees = new Set(filteredData.filter(u => u.attendee?.category_id === tc.id).map(u => u.attendee_id));
        return {
          id: tc.id,
          name: tc.name,
          totalAttendees: categoryAttendees.length,
          usedAttendees: usedAttendees.size,
          coverage: categoryAttendees.length > 0 ? (usedAttendees.size / categoryAttendees.length) * 100 : 0,
          color: tc.color
        };
      });
    }

    return { controlCoverage, categoryCoverage };
  }, [filteredData, attendees, controlTypes, ticketCategories, cedulasAutorizadas, normalizedCedulaUsage]);

  // Intraday insights for single-day events
  const intradayInsights = useMemo(() => {
    const isSingleDay = filters.timeRange === 'today' || filters.timeRange === 'yesterday';
    
    if (!isSingleDay || filteredData.length === 0) {
      return {
        isSingleDay: false,
        minuteIntervals: [],
        cumulativeProgress: [],
        movingAverage: [],
        controlTypeByHour: [],
        categoryHeatmap: [],
        peakDetection: { peaks: [], troughs: [] },
        dailyRhythm: { current: 0, predicted: 0, eta: null }
      };
    }

    // 5-minute intervals
    const minuteIntervals = Array.from({ length: 288 }, (_, i) => {
      const startTime = new Date();
      startTime.setHours(0, i * 5, 0, 0);
      const endTime = addMinutes(startTime, 5);
      const timeKey = format(startTime, 'HH:mm');
      
      const usagesInInterval = filteredData.filter(usage => {
        const usageTime = parseISO(usage.used_at);
        return usageTime >= startTime && usageTime < endTime;
      }).length;

      return { time: timeKey, count: usagesInInterval, minute: i * 5 };
    }).filter(interval => interval.count > 0);

    // Cumulative progress
    const cumulativeProgress = hourlyDistribution.reduce((acc, curr, index) => {
      const previousTotal = index > 0 ? acc[index - 1].cumulative : 0;
      acc.push({
        hour: curr.hour,
        hourly: curr.count,
        cumulative: previousTotal + curr.count
      });
      return acc;
    }, [] as Array<{ hour: string; hourly: number; cumulative: number }>);

    // Moving average (3-hour window)
    const movingAverage = hourlyDistribution.map((curr, index) => {
      const windowStart = Math.max(0, index - 1);
      const windowEnd = Math.min(hourlyDistribution.length - 1, index + 1);
      const windowData = hourlyDistribution.slice(windowStart, windowEnd + 1);
      const average = windowData.reduce((sum, item) => sum + item.count, 0) / windowData.length;
      
      return {
        hour: curr.hour,
        actual: curr.count,
        average: Math.round(average * 10) / 10
      };
    });

    // Control types stacked by hour
    const controlTypeByHour = hourlyDistribution.map(hourData => {
      const hourUsages = filteredData.filter(usage => {
        const usageHour = format(parseISO(usage.used_at), 'HH:mm');
        return usageHour === hourData.hour;
      });

      const byControlType = controlTypes.reduce((acc, ct) => {
        const count = hourUsages.filter(u => u.control_type_id === ct.id).length;
        if (count > 0) acc[ct.name] = count;
        return acc;
      }, {} as Record<string, number>);

      return { hour: hourData.hour, ...byControlType };
    });

    // Category heatmap by hour
    const categoryHeatmap = ticketCategories.map(category => {
      const hourlyData = hourlyDistribution.map(hourData => {
        const hourUsages = filteredData.filter(usage => {
          const usageHour = format(parseISO(usage.used_at), 'HH:mm');
          return usageHour === hourData.hour && usage.attendee?.category_id === category.id;
        });
        
        return {
          hour: hourData.hour,
          count: hourUsages.length,
          intensity: hourlyDistribution.length > 0 ? (hourUsages.length / Math.max(...hourlyDistribution.map(h => h.count))) : 0
        };
      });

      return {
        category: category.name,
        color: category.color,
        data: hourlyData
      };
    });

    // Peak and trough detection
    const peaks: Array<{ hour: string; count: number }> = [];
    const troughs: Array<{ hour: string; count: number }> = [];
    
    hourlyDistribution.forEach((curr, index) => {
      const prev = hourlyDistribution[index - 1];
      const next = hourlyDistribution[index + 1];
      
      if (prev && next) {
        if (curr.count > prev.count && curr.count > next.count) {
          peaks.push({ hour: curr.hour, count: curr.count });
        }
        if (curr.count < prev.count && curr.count < next.count && curr.count > 0) {
          troughs.push({ hour: curr.hour, count: curr.count });
        }
      }
    });

    // Daily rhythm and ETA calculation
    const totalUsages = filteredData.length;
    const currentHour = new Date().getHours();
    const currentProgress = cumulativeProgress.find(p => parseInt(p.hour.split(':')[0]) === currentHour);
    const currentCount = currentProgress?.cumulative || 0;
    
    // Simple linear prediction based on current pace
    const hoursElapsed = currentHour > 0 ? currentHour : 1;
    const currentPace = currentCount / hoursElapsed;
    const predictedTotal = Math.round(currentPace * 24);
    
    // ETA for significant milestones
    const milestones = [100, 500, 1000, 2000];
    const nextMilestone = milestones.find(m => m > currentCount);
    const eta = nextMilestone && currentPace > 0 
      ? new Date(Date.now() + ((nextMilestone - currentCount) / currentPace) * 60 * 60 * 1000)
      : null;

    return {
      isSingleDay: true,
      minuteIntervals,
      cumulativeProgress,
      movingAverage,
      controlTypeByHour,
      categoryHeatmap,
      peakDetection: { peaks, troughs },
      dailyRhythm: { 
        current: currentCount, 
        predicted: predictedTotal, 
        eta: eta ? format(eta, 'HH:mm') : null 
      }
    };
  }, [filteredData, hourlyDistribution, controlTypes, ticketCategories, filters.timeRange]);

  // Recent activity (last 20 records)
  const recentActivity = useMemo(() => {
    return filteredData
      .slice(0, 20)
      .map(usage => ({
        ...usage,
        timeAgo: format(parseISO(usage.used_at), 'HH:mm', { locale: es }),
        attendeeName: usage.attendee?.name || 'Desconocido',
        controlName: usage.control_type?.name || 'Desconocido',
        categoryName: usage.attendee?.ticket_category?.name || 'Desconocido'
      }));
  }, [filteredData]);

  return {
    filteredData,
    enhancedMetrics,
    timeSeriesData,
    hourlyDistribution,
    coverageAnalysis,
    recentActivity,
    intradayInsights
  };
};