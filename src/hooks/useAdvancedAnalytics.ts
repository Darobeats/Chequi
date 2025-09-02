import { useMemo } from 'react';
import { useControlUsage, useAttendees, useControlTypes, useTicketCategories, useCategoryControls } from './useSupabaseData';
import { startOfHour, startOfDay, parseISO, format, isToday, isYesterday, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

export const useAdvancedAnalytics = (filters: {
  controlType: string;
  category: string;
  timeRange: string;
}) => {
  const { data: controlUsage = [] } = useControlUsage();
  const { data: attendees = [] } = useAttendees();
  const { data: controlTypes = [] } = useControlTypes();
  const { data: ticketCategories = [] } = useTicketCategories();
  const { data: categoryControls = [] } = useCategoryControls();

  // Filter data based on selections
  const filteredData = useMemo(() => {
    return controlUsage.filter(usage => {
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
  }, [controlUsage, filters]);

  // Enhanced KPIs
  const enhancedMetrics = useMemo(() => {
    const totalUsages = filteredData.length;
    const uniqueAttendees = new Set(filteredData.map(u => u.attendee_id)).size;
    const totalAttendees = attendees.length;
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
  }, [filteredData, attendees, controlTypes, ticketCategories]);

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
    const controlCoverage = controlTypes.map(ct => {
      const usages = filteredData.filter(u => u.control_type_id === ct.id).length;
      const uniqueUsers = new Set(filteredData.filter(u => u.control_type_id === ct.id).map(u => u.attendee_id)).size;
      
      return {
        id: ct.id,
        name: ct.name,
        totalUsages: usages,
        uniqueUsers,
        coverage: attendees.length > 0 ? (uniqueUsers / attendees.length) * 100 : 0,
        color: ct.color
      };
    });

    const categoryCoverage = ticketCategories.map(tc => {
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

    return { controlCoverage, categoryCoverage };
  }, [filteredData, attendees, controlTypes, ticketCategories]);

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
    recentActivity
  };
};