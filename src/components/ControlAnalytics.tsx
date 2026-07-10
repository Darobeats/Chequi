import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { useControlTypes, useTicketCategories, useAttendees, useControlUsage } from '@/hooks/useSupabaseData';
import { Filter, Loader2, ChevronDown } from 'lucide-react';

import AnalyticsKPIStrip from './analytics/AnalyticsKPIStrip';
import CategoryBreakdownPanel from './analytics/CategoryBreakdownPanel';
import ControlTypePanel from './analytics/ControlTypePanel';
import CategoryHourHeatmap from './analytics/CategoryHourHeatmap';
import TrendAnalysis from './analytics/TrendAnalysis';
import LiveActivityFeed from './analytics/LiveActivityFeed';
import DetailedDataTable from './analytics/DetailedDataTable';

const ControlAnalytics = () => {
  const { data: controlTypes = [] } = useControlTypes();
  const { data: ticketCategories = [] } = useTicketCategories();
  const { isLoading: loadingAttendees, isError: errorAttendees } = useAttendees();
  const { isLoading: loadingUsage, isError: errorUsage } = useControlUsage();
  const isLoadingData = loadingAttendees || loadingUsage;
  const hasDataError = errorAttendees || errorUsage;

  const [selectedControlType, setSelectedControlType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('today');

  const {
    filteredData,
    enhancedMetrics,
    timeSeriesData,
    hourlyDistribution,
    coverageAnalysis,
    recentActivity,
    intradayInsights,
    categoryByHour,
  } = useAdvancedAnalytics({
    controlType: selectedControlType,
    category: selectedCategory,
    timeRange,
  });

  // Total usages per category (from category_by_hour aggregates)
  const totalUsagesByCategory = useMemo(() => {
    const m = new Map<string, number>();
    categoryByHour.forEach((r: any) => {
      m.set(r.category_id, (m.get(r.category_id) ?? 0) + r.count);
    });
    return m;
  }, [categoryByHour]);

  // Sparkline data per category (chronological counts by hour)
  const sparklinesByCategory = useMemo(() => {
    const perCat = new Map<string, Map<string, number>>();
    const hoursSet = new Set<string>();
    categoryByHour.forEach((r: any) => {
      hoursSet.add(r.hour);
      if (!perCat.has(r.category_id)) perCat.set(r.category_id, new Map());
      perCat.get(r.category_id)!.set(r.hour, r.count);
    });
    const hours = Array.from(hoursSet).sort();
    const out = new Map<string, number[]>();
    perCat.forEach((counts, catId) => {
      out.set(catId, hours.map((h) => counts.get(h) ?? 0));
    });
    return out;
  }, [categoryByHour]);

  const projection = intradayInsights.isSingleDay
    ? { predicted: intradayInsights.dailyRhythm.predicted, eta: intradayInsights.dailyRhythm.eta }
    : null;

  const quickRanges = [
    { key: 'today', label: 'Hoy' },
    { key: 'yesterday', label: 'Ayer' },
    { key: 'week', label: 'Semana' },
    { key: 'all', label: 'Todo' },
  ];

  return (
    <div className="space-y-4">
      {isLoadingData && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-card/50 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Cargando datos del evento…
        </div>
      )}
      {hasDataError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Ocurrió un error cargando los datos. Verifica tu conexión o recarga la página.
        </div>
      )}

      {/* Filters: chips for time + selects for filters */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-primary shrink-0" />
            {quickRanges.map((r) => (
              <button
                key={r.key}
                onClick={() => setTimeRange(r.key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  timeRange === r.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {r.label}
              </button>
            ))}
            <div className="flex-1" />
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={selectedControlType} onValueChange={setSelectedControlType}>
                <SelectTrigger className="h-8 text-xs bg-input border-border flex-1 sm:w-[160px]">
                  <SelectValue placeholder="Control" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los controles</SelectItem>
                  {controlTypes.map((ct: any) => (
                    <SelectItem key={ct.id} value={ct.id} className="capitalize">
                      {ct.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-8 text-xs bg-input border-border flex-1 sm:w-[160px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {ticketCategories.map((tc: any) => (
                    <SelectItem key={tc.id} value={tc.id} className="capitalize">
                      {tc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI strip */}
      <AnalyticsKPIStrip
        totalUsages={enhancedMetrics.totalUsages}
        uniqueAttendees={enhancedMetrics.uniqueAttendees}
        totalAttendees={enhancedMetrics.totalAttendees}
        participationRate={enhancedMetrics.participationRate}
        peakHour={enhancedMetrics.peakHour}
        projection={projection}
      />

      {/* Main grid: mobile priority = categories, live, trend, controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="order-1">
          <CategoryBreakdownPanel
            categories={coverageAnalysis.categoryCoverage}
            totalUsagesByCategory={totalUsagesByCategory}
            sparklinesByCategory={sparklinesByCategory}
          />
        </div>
        <div className="order-3 lg:order-2">
          <TrendAnalysis
            timeSeriesData={timeSeriesData}
            hourlyDistribution={hourlyDistribution}
            intradayInsights={intradayInsights}
          />
        </div>
        <div className="order-2 lg:order-3">
          <LiveActivityFeed recentActivity={recentActivity} />
        </div>
        <div className="order-4">
          <ControlTypePanel controls={coverageAnalysis.controlCoverage} />
        </div>
      </div>

      {/* Heatmap full width */}
      <CategoryHourHeatmap categoryByHour={categoryByHour as any} />

      {/* Detailed table collapsed */}
      <details className="group rounded-lg border border-border bg-card/50">
        <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-2 text-sm font-medium text-foreground hover:bg-muted/40 rounded-lg">
          <ChevronDown className="h-4 w-4 text-primary transition-transform group-open:rotate-180" />
          Ver registros detallados
          <span className="ml-auto text-xs text-muted-foreground">{filteredData.length} registros</span>
        </summary>
        <div className="p-3 sm:p-4 border-t border-border">
          <DetailedDataTable data={filteredData} />
        </div>
      </details>
    </div>
  );
};

export default ControlAnalytics;
