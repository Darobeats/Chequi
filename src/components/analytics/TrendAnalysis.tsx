import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface Props {
  timeSeriesData: Array<{ date: string; count: number; formattedDate: string }>;
  hourlyDistribution: Array<{ hour: string; count: number; usage: number }>;
  intradayInsights: {
    isSingleDay: boolean;
    cumulativeProgress: Array<{ hour: string; hourly: number; cumulative: number }>;
    peakDetection: { peaks: Array<{ hour: string; count: number }> };
  };
}

const chartConfig = {
  hourly: { label: 'Usos', color: 'hsl(var(--primary))' },
  cumulative: { label: 'Acumulado', color: 'hsl(var(--accent))' },
};

const TrendAnalysis: React.FC<Props> = ({ timeSeriesData, hourlyDistribution, intradayInsights }) => {
  if (intradayInsights.isSingleDay && intradayInsights.cumulativeProgress.length > 0) {
    const topPeak = intradayInsights.peakDetection.peaks[0];
    return (
      <Card className="bg-card/50 border-border h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2 flex-wrap">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
            <span>Ritmo del evento (hora × hora)</span>
            {topPeak && (
              <span className="ml-auto text-xs text-muted-foreground">
                Pico {topPeak.hour} · {topPeak.count}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <ChartContainer config={chartConfig} className="h-[200px] sm:h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={intradayInsights.cumulativeProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar yAxisId="left" dataKey="hourly" fill="hsl(var(--primary))" fillOpacity={0.7} name="Usos por hora" radius={[3, 3, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  name="Acumulado"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary shrink-0" />
          <span>Tendencia</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <ChartContainer config={chartConfig} className="h-[200px] sm:h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeriesData.length ? timeSeriesData : hourlyDistribution.map(h => ({ formattedDate: h.hour, count: h.count }))}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="formattedDate" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#trendGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default TrendAnalysis;
