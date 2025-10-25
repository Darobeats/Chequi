
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { useControlTypes, useTicketCategories } from '@/hooks/useSupabaseData';
import { Filter, BarChart3, TrendingUp, Target, Activity, Eye } from 'lucide-react';

// Import the new analytics components
import EnhancedKPIs from './analytics/EnhancedKPIs';
import TrendAnalysis from './analytics/TrendAnalysis';
import CoverageMetrics from './analytics/CoverageMetrics';
import LiveActivityFeed from './analytics/LiveActivityFeed';
import DetailedDataTable from './analytics/DetailedDataTable';

const ControlAnalytics = () => {
  const { data: controlTypes = [] } = useControlTypes();
  const { data: ticketCategories = [] } = useTicketCategories();

  const [selectedControlType, setSelectedControlType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('today');
  const [activeTab, setActiveTab] = useState<string>('overview');

  const {
    filteredData,
    enhancedMetrics,
    timeSeriesData,
    hourlyDistribution,
    coverageAnalysis,
    recentActivity,
    intradayInsights
  } = useAdvancedAnalytics({
    controlType: selectedControlType,
    category: selectedCategory,
    timeRange
  });


  return (
    <div className="space-y-6">
      {/* Enhanced Filters */}
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filtros Avanzados de Análisis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Período</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="yesterday">Ayer</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                  <SelectItem value="all">Todo el tiempo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Tipo de Control</label>
              <Select value={selectedControlType} onValueChange={setSelectedControlType}>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">Todos</SelectItem>
                  {controlTypes.map(ct => (
                    <SelectItem key={ct.id} value={ct.id} className="capitalize">
                      {ct.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Categoría</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">Todas</SelectItem>
                  {ticketCategories.map(tc => (
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

      {/* Enhanced KPIs */}
      <EnhancedKPIs metrics={enhancedMetrics} />

      {/* Advanced Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <Card className="bg-card/50 border-border">
          <CardContent className="pt-6 overflow-x-auto">
            <TabsList className="inline-flex w-full min-w-max bg-muted">
              <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
                <BarChart3 className="h-4 w-4 shrink-0" />
                <span className="text-xs sm:text-sm">Resumen</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
                <TrendingUp className="h-4 w-4 shrink-0" />
                <span className="text-xs sm:text-sm">Tendencias</span>
              </TabsTrigger>
              <TabsTrigger value="coverage" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
                <Target className="h-4 w-4 shrink-0" />
                <span className="text-xs sm:text-sm">Cobertura</span>
              </TabsTrigger>
              <TabsTrigger value="live" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
                <Activity className="h-4 w-4 shrink-0" />
                <span className="text-xs sm:text-sm">En Vivo</span>
              </TabsTrigger>
              <TabsTrigger value="details" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
                <Eye className="h-4 w-4 shrink-0" />
                <span className="text-xs sm:text-sm">Detalles</span>
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        <TabsContent value="overview" className="space-y-6">
          <TrendAnalysis 
            timeSeriesData={timeSeriesData}
            hourlyDistribution={hourlyDistribution}
            intradayInsights={intradayInsights}
          />
        </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <TrendAnalysis 
              timeSeriesData={timeSeriesData}
              hourlyDistribution={hourlyDistribution}
              intradayInsights={intradayInsights}
            />
          </TabsContent>

        <TabsContent value="coverage" className="space-y-6">
          <CoverageMetrics coverageAnalysis={coverageAnalysis} />
        </TabsContent>

        <TabsContent value="live" className="space-y-6">
          <LiveActivityFeed recentActivity={recentActivity} />
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <DetailedDataTable data={filteredData} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ControlAnalytics;
