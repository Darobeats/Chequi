import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers } from 'lucide-react';

interface Row {
  hour: string;
  category_id: string;
  category_name: string;
  category_color: string | null;
  count: number;
}

interface Props {
  categoryByHour: Row[];
}

const CategoryHourHeatmap: React.FC<Props> = ({ categoryByHour }) => {
  if (!categoryByHour || categoryByHour.length === 0) {
    return (
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary shrink-0" />
            <span>Actividad por categoría y hora</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm text-muted-foreground py-6 text-center">Sin datos suficientes</p>
        </CardContent>
      </Card>
    );
  }

  const hoursSet = new Set<string>();
  const catsMap = new Map<string, { name: string; color: string; totals: Map<string, number> }>();
  let max = 1;
  categoryByHour.forEach((r) => {
    hoursSet.add(r.hour);
    if (!catsMap.has(r.category_id)) {
      catsMap.set(r.category_id, {
        name: r.category_name,
        color: r.category_color || 'hsl(var(--primary))',
        totals: new Map(),
      });
    }
    catsMap.get(r.category_id)!.totals.set(r.hour, r.count);
    if (r.count > max) max = r.count;
  });
  const hours = Array.from(hoursSet).sort();
  const cats = Array.from(catsMap.entries())
    .map(([id, c]) => ({ id, ...c, total: Array.from(c.totals.values()).reduce((s, v) => s + v, 0) }))
    .sort((a, b) => b.total - a.total);

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary shrink-0" />
          <span>Actividad por categoría y hora</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-0.5 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-card z-10 text-left text-muted-foreground font-normal px-2 py-1 min-w-[110px]">
                  Categoría
                </th>
                {hours.map((h) => (
                  <th key={h} className="text-center text-muted-foreground font-normal px-1 py-1 min-w-[28px]">
                    {h.split(':')[0]}
                  </th>
                ))}
                <th className="text-right text-muted-foreground font-normal px-2 py-1">Σ</th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id}>
                  <td className="sticky left-0 bg-card z-10 pr-2 py-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="capitalize text-foreground truncate max-w-[110px]">{c.name}</span>
                    </div>
                  </td>
                  {hours.map((h) => {
                    const count = c.totals.get(h) ?? 0;
                    const intensity = count / max;
                    return (
                      <td key={h} className="p-0">
                        <div
                          className="w-full h-7 rounded-sm flex items-center justify-center text-[10px] font-medium tabular-nums"
                          style={{
                            backgroundColor: count > 0 ? c.color : 'hsl(var(--muted))',
                            opacity: count > 0 ? 0.25 + intensity * 0.75 : 0.3,
                            color: intensity > 0.5 ? '#fff' : 'hsl(var(--foreground))',
                          }}
                          title={`${c.name} · ${h}: ${count}`}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      </td>
                    );
                  })}
                  <td className="text-right px-2 py-0.5 tabular-nums font-semibold text-foreground">{c.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryHourHeatmap;
