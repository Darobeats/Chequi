import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ControlRow {
  id: string;
  name: string;
  totalUsages: number;
  uniqueUsers: number;
  coverage: number;
  color?: string;
}

interface Props {
  controls: ControlRow[];
}

const FALLBACK = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const ControlTypePanel: React.FC<Props> = ({ controls }) => {
  const sorted = [...controls].sort((a, b) => b.totalUsages - a.totalUsages);
  const total = sorted.reduce((s, c) => s + c.totalUsages, 0);
  const data = sorted.map((c, i) => ({
    name: c.name,
    value: c.totalUsages,
    color: c.color || FALLBACK[i % FALLBACK.length],
  }));

  return (
    <Card className="bg-card/50 border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary shrink-0" />
          <span>Tipos de control</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sin actividad registrada</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="w-[140px] h-[140px] relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    innerRadius={42}
                    outerRadius={62}
                    paddingAngle={2}
                    stroke="hsl(var(--card))"
                  >
                    {data.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-bold text-foreground leading-none">{total.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground uppercase">usos</span>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 w-full min-w-0">
              {sorted.map((c, i) => {
                const color = c.color || FALLBACK[i % FALLBACK.length];
                const pct = total > 0 ? (c.totalUsages / total) * 100 : 0;
                return (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="capitalize text-foreground truncate flex-1">{c.name}</span>
                    <span className="tabular-nums text-muted-foreground text-xs">{c.totalUsages}</span>
                    <span className="tabular-nums font-semibold text-foreground min-w-[3ch] text-right">
                      {pct.toFixed(0)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ControlTypePanel;
