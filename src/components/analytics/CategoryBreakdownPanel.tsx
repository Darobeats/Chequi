import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface CategoryRow {
  id: string;
  name: string;
  totalAttendees: number;
  usedAttendees: number;
  coverage: number;
  color?: string;
}

interface Props {
  categories: CategoryRow[];
  totalUsagesByCategory?: Map<string, number>;
  sparklinesByCategory?: Map<string, number[]>;
}

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 80;
  const h = 22;
  const step = w / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline fill="none" stroke={color} strokeWidth={1.5} points={points} />
    </svg>
  );
};

const CategoryBreakdownPanel: React.FC<Props> = ({ categories, totalUsagesByCategory, sparklinesByCategory }) => {
  const sorted = [...categories].sort((a, b) => b.usedAttendees - a.usedAttendees);

  return (
    <Card className="bg-card/50 border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary shrink-0" />
          <span>Ingresos por categoría de ticket</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sin categorías configuradas</p>
        ) : (
          <ul className="space-y-2.5">
            {sorted.map((c) => {
              const color = c.color || 'hsl(var(--primary))';
              const usages = totalUsagesByCategory?.get(c.id) ?? c.usedAttendees;
              const spark = sparklinesByCategory?.get(c.id) ?? [];
              return (
                <li key={c.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-medium text-foreground truncate flex-1 capitalize">{c.name}</span>
                    <Sparkline data={spark} color={color} />
                    <span className="tabular-nums text-foreground font-semibold min-w-[3ch] text-right">
                      {c.coverage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${Math.min(100, c.coverage)}%`, backgroundColor: color }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                    <span>
                      {c.usedAttendees.toLocaleString()} / {c.totalAttendees.toLocaleString()} ingresados
                    </span>
                    <span>{usages.toLocaleString()} usos</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryBreakdownPanel;
