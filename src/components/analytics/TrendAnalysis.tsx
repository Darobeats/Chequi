import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp } from 'lucide-react';

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
}

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ timeSeriesData, hourlyDistribution }) => {
  const chartConfig = {
    count: {
      label: "Usos",
      color: "hsl(var(--primary))",
    },
  };

  // Calculate trend
  const trend = timeSeriesData.length > 1 
    ? timeSeriesData[timeSeriesData.length - 1].count - timeSeriesData[timeSeriesData.length - 2].count 
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Trend */}
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Tendencia Diaria
            {trend > 0 && <span className="text-green-400 text-sm">↗ +{trend}</span>}
            {trend < 0 && <span className="text-red-400 text-sm">↘ {trend}</span>}
            {trend === 0 && <span className="text-gray-400 text-sm">→ Sin cambio</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
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
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
        </CardContent>
      </Card>

      {/* Hourly Distribution */}
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Distribución por Horas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="hour" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="usage" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrendAnalysis;