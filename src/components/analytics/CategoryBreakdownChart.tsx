import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Layers } from 'lucide-react';

interface Props {
  categoryByHour: Array<{
    hour: string;
    category_id: string;
    category_name: string;
    category_color: string | null;
    count: number;
  }>;
}

const CategoryBreakdownChart: React.FC<Props> = ({ categoryByHour }) => {
  if (!categoryByHour || categoryByHour.length === 0) return null;

  // Pivot to { hour, [categoryName]: count }
  const byHour = new Map<string, any>();
  const catColor = new Map<string, string>();
  categoryByHour.forEach((row) => {
    const key = row.hour;
    if (!byHour.has(key)) byHour.set(key, { hour: key });
    byHour.get(key)[row.category_name] = row.count;
    if (row.category_color) catColor.set(row.category_name, row.category_color);
  });
  const data = Array.from(byHour.values()).sort((a, b) => a.hour.localeCompare(b.hour));
  const categoryNames = Array.from(new Set(categoryByHour.map((c) => c.category_name)));

  const chartConfig = Object.fromEntries(
    categoryNames.map((n, i) => [n, { label: n, color: catColor.get(n) || `hsl(var(--chart-${(i % 5) + 1}))` }]),
  );

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader>
        <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
          <span className="truncate">Ingresos por Categoría (invitados / socios / …) por hora</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[300px]">
          <ChartContainer config={chartConfig as any} className="h-[280px] sm:h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {categoryNames.map((name, i) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    stackId="cats"
                    fill={catColor.get(name) || `hsl(var(--chart-${(i % 5) + 1}))`}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryBreakdownChart;
