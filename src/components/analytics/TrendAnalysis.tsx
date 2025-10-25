import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ComposedChart } from 'recharts';
import { TrendingUp, Activity, Target, Clock, Zap } from 'lucide-react';

interface TrendAnalysisProps {
  timeSeriesData: Array<{
    date: string;
    count: number;
    formattedDate: string;
    isToday: boolean;
    isYesterday: boolean;
  }>;
  hourlyDistribution: Array<{
    hour: string;
    count: number;
    usage: number;
  }>;
  intradayInsights: {
    isSingleDay: boolean;
    minuteIntervals: Array<{ time: string; count: number; minute: number }>;
    cumulativeProgress: Array<{ hour: string; hourly: number; cumulative: number }>;
    movingAverage: Array<{ hour: string; actual: number; average: number }>;
    controlTypeByHour: Array<{ hour: string; [key: string]: any }>;
    categoryHeatmap: Array<{
      category: string;
      color: string | null;
      data: Array<{ hour: string; count: number; intensity: number }>;
    }>;
    peakDetection: { 
      peaks: Array<{ hour: string; count: number }>; 
      troughs: Array<{ hour: string; count: number }> 
    };
    dailyRhythm: { current: number; predicted: number; eta: string | null };
  };
}

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ timeSeriesData, hourlyDistribution, intradayInsights }) => {
  const chartConfig = {
    count: { label: "Usos", color: "hsl(var(--primary))" },
    cumulative: { label: "Acumulado", color: "hsl(var(--secondary))" },
    average: { label: "Promedio", color: "hsl(var(--accent))" },
  };

  // For single-day events, show intraday insights
  if (intradayInsights.isSingleDay) {
    return (
      <div className="space-y-6">
        {/* Daily Rhythm Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Ritmo Actual</p>
                  <p className="text-xl font-semibold">{intradayInsights.dailyRhythm.current}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-secondary" />
                <div>
                  <p className="text-sm text-muted-foreground">Proyección Final</p>
                  <p className="text-xl font-semibold">{intradayInsights.dailyRhythm.predicted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {intradayInsights.dailyRhythm.eta && (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-sm text-muted-foreground">Próximo Hito</p>
                    <p className="text-xl font-semibold">{intradayInsights.dailyRhythm.eta}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cumulative Progress with Moving Average */}
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <span className="truncate">Progreso Acumulado vs Promedio</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[300px]">
                <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={intradayInsights.movingAverage}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="hour" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10}
                        tick={{ fontSize: 10 }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar 
                        dataKey="actual" 
                        fill="hsl(var(--primary))" 
                        fillOpacity={0.6}
                        name="Uso por Hora"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="average" 
                        stroke="hsl(var(--accent))" 
                        strokeWidth={2}
                        name="Promedio Móvil"
                        dot={{ fill: "hsl(var(--accent))", r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Peak Activity Detection */}
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Picos de Actividad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Picos de Mayor Actividad</h4>
                  <div className="space-y-1">
                    {intradayInsights.peakDetection.peaks.slice(0, 3).map((peak, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-primary/10 rounded">
                        <span className="text-sm">{peak.hour}</span>
                        <span className="text-sm font-medium">{peak.count} usos</span>
                      </div>
                    ))}
                  </div>
                </div>

                {intradayInsights.peakDetection.troughs.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Momentos de Menor Actividad</h4>
                    <div className="space-y-1">
                      {intradayInsights.peakDetection.troughs.slice(0, 2).map((trough, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                          <span className="text-sm">{trough.hour}</span>
                          <span className="text-sm font-medium">{trough.count} usos</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Control Type Distribution by Hour */}
        {intradayInsights.controlTypeByHour.length > 0 && (
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <span className="truncate">Distribución de Tipos de Control por Hora</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[300px]">
                <ChartContainer config={chartConfig} className="h-[300px] sm:h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={intradayInsights.controlTypeByHour}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="hour" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10}
                        tick={{ fontSize: 10 }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {Object.keys(intradayInsights.controlTypeByHour[0] || {})
                        .filter(key => key !== 'hour')
                        .map((controlType, index) => (
                          <Bar
                            key={controlType}
                            dataKey={controlType}
                            stackId="controlTypes"
                            fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                          />
                        ))}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // For multi-day events, show traditional daily trend
  const trend = timeSeriesData.length > 1 
    ? timeSeriesData[timeSeriesData.length - 1].count - timeSeriesData[timeSeriesData.length - 2].count 
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Trend */}
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2 flex-wrap">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <span>Tendencia Diaria</span>
            {trend > 0 && <span className="text-green-400 text-xs sm:text-sm">↗ +{trend}</span>}
            {trend < 0 && <span className="text-red-400 text-xs sm:text-sm">↘ {trend}</span>}
            {trend === 0 && <span className="text-gray-400 text-xs sm:text-sm">→ Sin cambio</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[300px]">
            <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="formattedDate" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    labelFormatter={(value, payload) => {
                      const data = payload?.[0]?.payload;
                      if (data?.isToday) return `Hoy (${value})`;
                      if (data?.isYesterday) return `Ayer (${value})`;
                      return value;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fill="url(#colorGradient)"
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* Hourly Distribution */}
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <span>Distribución por Horas</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[300px]">
            <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="usage" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrendAnalysis;